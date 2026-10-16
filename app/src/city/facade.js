import * as THREE from 'three';

// Building styles drawn by the facade shader.
export const STYLE = { GLASS: 0, OFFICE: 1, RESIDENTIAL: 2, BRICK: 3 };

// Night facade shader: per-style wall colour and window grid, floor slabs, mullions on glass,
// lit/unlit windows with varied colour and brightness, glowing shop fronts at street level,
// simple moonlight shading and distance fog.
// Instanced city blocks pass aSeed/aStyle per building; landmarks pass uniforms and a tint.
export function facadeMaterial({ instanced = false, fog, density, tint = null, seed = 0.5, style = STYLE.OFFICE, litRatio = -1 } = {}) {
  return new THREE.ShaderMaterial({
    defines: { INSTANCED_CITY: instanced ? 1 : 0, TINTED: tint ? 1 : 0 },
    uniforms: {
      uFog: { value: fog },
      uDensity: { value: density },
      uSeed: { value: seed },
      uStyle: { value: style },
      uTint: { value: new THREE.Color(tint ?? 0xffffff) },
      uLit: { value: litRatio },
    },
    vertexShader: /* glsl */ `
      #if INSTANCED_CITY
      attribute float aSeed;
      attribute float aStyle;
      #endif
      uniform float uSeed; uniform float uStyle;
      varying vec3 vPos; varying vec3 vN; varying float vSeed; varying float vStyle; varying float vDepth;
      void main() {
        #if INSTANCED_CITY
        mat4 m = modelMatrix * instanceMatrix;
        vSeed = aSeed; vStyle = aStyle;
        #else
        mat4 m = modelMatrix;
        vSeed = uSeed; vStyle = uStyle;
        #endif
        vec4 wp = m * vec4(position, 1.0);
        vPos = wp.xyz;
        vN = normalize(mat3(m) * normal);
        vec4 mv = viewMatrix * wp;
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFog; uniform float uDensity; uniform vec3 uTint; uniform float uLit;
      varying vec3 vPos; varying vec3 vN; varying float vSeed; varying float vStyle; varying float vDepth;

      // sin-free hash: stable on low-precision mobile GPUs
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

      vec3 roomLight(float h) {
        if (h < 0.5) return vec3(1.0, 0.74, 0.42);   // warm incandescent
        if (h < 0.78) return vec3(1.0, 0.88, 0.70);  // neutral
        if (h < 0.95) return vec3(0.68, 0.84, 1.0);  // cool office LED
        return vec3(0.45, 0.55, 1.0);                // TV glow
      }

      void main() {
        int style = int(vStyle + 0.5);
        vec3 wall; float colW, rowH, x0, x1, y0, y1, lit;
        if (style == 0) {        // glass curtain wall
          wall = vec3(0.07, 0.10, 0.14); colW = 1.5; rowH = 3.3; x0 = 0.05; x1 = 0.95; y0 = 0.10; y1 = 0.94; lit = 0.24;
        } else if (style == 1) { // office: ribbon windows
          wall = vec3(0.19, 0.20, 0.22); colW = 2.1; rowH = 3.5; x0 = 0.04; x1 = 0.96; y0 = 0.38; y1 = 0.88; lit = 0.34;
        } else if (style == 2) { // residential
          wall = vec3(0.23, 0.21, 0.19); colW = 2.3; rowH = 2.9; x0 = 0.28; x1 = 0.72; y0 = 0.30; y1 = 0.80; lit = 0.5;
        } else {                 // brick low-rise
          wall = vec3(0.30, 0.15, 0.10); colW = 2.0; rowH = 3.0; x0 = 0.30; x1 = 0.70; y0 = 0.24; y1 = 0.76; lit = 0.55;
        }
        wall *= 0.8 + 0.4 * vSeed;
        if (uLit >= 0.0) lit = uLit;
        #if TINTED
        wall = mix(wall, uTint * 0.22, 0.55);
        #endif

        // moonlight + sky shading so faces read as solid volumes
        float shade = 0.62 + 0.38 * clamp(dot(vN, normalize(vec3(-0.55, 0.45, 0.7))), 0.0, 1.0);
        vec3 col;
        if (abs(vN.y) > 0.5) {
          col = wall * (vN.y > 0.0 ? 0.5 : 0.3);  // roofs
        } else {
          float u = abs(vN.x) > 0.5 ? vPos.z : vPos.x;
          vec2 g = vec2(u / colW, vPos.y / rowH);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float win = step(x0, f.x) * step(f.x, x1) * step(y0, f.y) * step(f.y, y1);
          float isLit = step(1.0 - lit, hash(cell + vSeed * 97.3));
          float bright = 0.55 + 0.45 * hash(cell * 2.17 + 3.3);
          vec3 lc = roomLight(hash(cell * 1.31 + vSeed * 7.7));
          #if TINTED
          lc = mix(uTint, vec3(1.0), 0.3 * hash(cell * 1.9));
          #endif
          // unlit glass reflects the night sky: darker low, bluer high, panels vary slightly
          vec3 glass = mix(vec3(0.03, 0.045, 0.08), vec3(0.11, 0.13, 0.24), clamp(vPos.y / 70.0, 0.0, 1.0));
          glass += vec3(0.015, 0.025, 0.04) * hash(vec2(cell.x * 3.1, floor(cell.y / 3.0)));
          vec3 winCol = mix(glass, lc * bright * (0.85 + 0.15 * sin(f.x * 3.14159)), isLit);
          col = mix(wall * shade, winCol, win);
          col *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.05, f.y));      // floor slab line
          if (style == 0) col = mix(col, vec3(0.13, 0.15, 0.19) * shade, step(fract(u / colW), 0.035) * 0.85); // mullions

          // shop fronts on the ground floor
          if (style != 0 && vPos.y < 3.4) {
            float seg = floor(u / 4.0);
            float fx = fract(u / 4.0);
            float shop = step(0.7, vPos.y) * step(vPos.y, 3.0) * step(0.08, fx) * step(fx, 0.92) * step(0.3, hash(vec2(seg, vSeed * 11.0)));
            vec3 sc = mix(vec3(1.0, 0.82, 0.58), vec3(0.45, 0.9, 1.0), step(0.62, hash(vec2(seg, vSeed * 13.0))));
            sc = mix(sc, vec3(1.0, 0.45, 0.72), step(0.88, hash(vec2(seg * 1.7, vSeed * 7.0))));
            col = mix(col, sc, shop);
            col = mix(col, vec3(0.06), step(3.0, vPos.y) * step(vPos.y, 3.4)); // awning line
          }
          col *= 0.72 + 0.28 * smoothstep(0.0, 20.0, vPos.y);
        }
        vec3 lin = pow(col, vec3(2.2));
        float fog = 1.0 - exp(-uDensity * uDensity * vDepth * vDepth);
        gl_FragColor = vec4(mix(lin, uFog, fog), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// Gradient night sky with a warm city glow on the horizon.
export function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.1, 1.0);
        vec3 zenith = vec3(0.012, 0.018, 0.05);
        vec3 horizon = vec3(0.09, 0.08, 0.17);
        vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.55, h));
        col += vec3(0.35, 0.16, 0.10) * exp(-max(h, 0.0) * 14.0) * 0.55; // city light pollution
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(650, 32, 16), mat);
  dome.renderOrder = -1;
  return dome;
}

// Soft radial glow texture (lamp pools, headlight beams, moon halo).
export function glowTexture(inner = 'rgba(255,220,170,1)', outer = 'rgba(255,220,170,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, inner);
  r.addColorStop(1, outer);
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
