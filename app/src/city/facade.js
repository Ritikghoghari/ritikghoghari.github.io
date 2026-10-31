import * as THREE from 'three';

// Building styles drawn by the facade shader.
export const STYLE = { GLASS: 0, OFFICE: 1, RESIDENTIAL: 2, BRICK: 3 };

// Shared clock for every facade (window lights switching on/off, TV flicker).
export const cityTime = { value: 0 };

// Night facade shader: per-style wall colour and window grid, floor slabs, mullions on glass,
// rooms behind the windows (interior mapping: back wall, floor, ceiling lamp, furniture, curtains/blinds),
// glass that reflects the sky and the city glow (fresnel), a few windows switching on and off,
// glowing shop fronts at street level, moonlight shading and distance fog.
// Instanced city blocks pass aSeed/aStyle per building; landmarks pass uniforms and a tint.
// Buildings are axis-aligned boxes, so each face's tangent frame comes straight from its normal.
export function facadeMaterial({ instanced = false, fog, density, tint = null, seed = 0.5, style = STYLE.OFFICE, litRatio = -1, interiors = true } = {}) {
  return new THREE.ShaderMaterial({
    defines: { INSTANCED_CITY: instanced ? 1 : 0, TINTED: tint ? 1 : 0, INTERIORS: interiors ? 1 : 0 },
    uniforms: {
      uFog: { value: fog },
      uDensity: { value: density },
      uSeed: { value: seed },
      uStyle: { value: style },
      uTint: { value: new THREE.Color(tint ?? 0xffffff) },
      uLit: { value: litRatio },
      uTime: cityTime,
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
      uniform vec3 uFog; uniform float uDensity; uniform vec3 uTint; uniform float uLit; uniform float uTime;
      varying vec3 vPos; varying vec3 vN; varying float vSeed; varying float vStyle; varying float vDepth;

      // sin-free hash: stable on low-precision mobile GPUs
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

      vec3 roomLight(float h) {
        if (h < 0.5) return vec3(1.0, 0.74, 0.42);   // warm incandescent
        if (h < 0.78) return vec3(1.0, 0.88, 0.70);  // neutral
        if (h < 0.95) return vec3(0.68, 0.84, 1.0);  // cool office LED
        return vec3(0.45, 0.55, 1.0);                // TV glow
      }

      // what the glass reflects: dark sky above, warm light-polluted horizon, lit street below,
      // plus faint reflected windows of the buildings across the street
      vec3 reflection(vec3 r) {
        vec3 c = mix(vec3(0.10, 0.09, 0.17), vec3(0.015, 0.02, 0.05), smoothstep(0.0, 0.6, r.y));
        c += vec3(0.38, 0.18, 0.10) * exp(-abs(r.y) * 9.0) * 0.6;
        if (r.y < 0.0) c = mix(c, vec3(0.16, 0.11, 0.07), smoothstep(0.0, -0.3, r.y));
        vec2 g = vec2(atan(r.x, r.z) * 38.0, r.y * 70.0);
        float spot = step(0.93, hash(floor(g))) * step(abs(r.y), 0.35);
        c += vec3(1.0, 0.8, 0.55) * spot * 0.35 * (1.0 - smoothstep(0.0, 0.35, abs(r.y)));
        return c;
      }

      // ray-marched room behind a window. f: position in the cell (0..1), d: view ray in room units
      vec3 room(vec2 f, vec3 d, vec2 cell, float isLit, vec3 lc, int style) {
        vec3 t3 = (step(vec3(0.0), d) - vec3(f, 0.0)) / d;
        float t = min(min(t3.x, t3.y), t3.z);
        vec3 h = vec3(f, 0.0) + d * t;
        float k = hash(cell * 4.13 + vSeed);
        vec3 wallC = mix(vec3(0.55, 0.50, 0.45), vec3(0.45, 0.50, 0.58), step(0.6, k));
        vec3 alb;
        float lamp = 0.0;
        if (t == t3.z) {                       // back wall, with furniture along the bottom
          alb = wallC;
          float sofa = step(h.y, 0.32) * step(0.15 + 0.3 * k, h.x) * step(h.x, 0.7 + 0.25 * k);
          float shelf = step(0.45, h.y) * step(h.y, 0.75) * step(0.05, h.x) * step(h.x, 0.2) * step(0.5, k);
          float art = step(0.5, h.y) * step(h.y, 0.72) * step(0.45, h.x) * step(h.x, 0.75) * step(k, 0.5);
          alb = mix(alb, vec3(0.12, 0.09, 0.08), max(sofa, shelf));
          alb = mix(alb, vec3(0.7, 0.35, 0.25) * (0.5 + k), art);
        } else if (t == t3.y && d.y < 0.0) {   // floor
          alb = mix(vec3(0.32, 0.22, 0.15), vec3(0.25, 0.25, 0.27), step(0.5, k));
          alb *= 0.6 + 0.4 * h.z;
        } else if (t == t3.y) {                // ceiling with a lamp in the middle
          alb = vec3(0.75);
          lamp = exp(-length(h.xz - vec2(0.5, 0.55)) * 7.0);
        } else {                               // side walls
          alb = wallC * 0.8;
        }
        float depthShade = 1.0 - 0.45 * h.z;
        vec3 lit = lc * alb * depthShade * 1.25 + lc * lamp * 1.6;
        vec3 dark = alb * 0.025 * depthShade;
        vec3 c = mix(dark, lit, isLit);
        // curtains (homes) or blinds (offices)
        if (style >= 2) {
          float cw = 0.12 + 0.18 * hash(cell * 2.9 + vSeed);
          float curtain = step(f.x, 0.28 + cw) * step(0.2, f.x) + step(0.72 - cw, f.x) * step(f.x, 0.8);
          c = mix(c, lc * vec3(0.55, 0.42, 0.32) * (0.25 + 0.75 * isLit) * (0.8 + 0.2 * sin(f.x * 90.0)), min(curtain, 1.0) * 0.85);
        } else if (style == 1 && hash(cell * 5.3) < 0.4) {
          c *= 0.55 + 0.45 * step(0.35, fract(f.y * 14.0));
        }
        return c;
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

        vec3 n = normalize(vN);
        vec3 V = normalize(vPos - cameraPosition);
        float fres = 0.04 + 0.96 * pow(1.0 - clamp(dot(-V, n), 0.0, 1.0), 5.0);
        vec3 refl = reflection(reflect(V, n));

        // moonlight + sky shading so faces read as solid volumes
        float shade = 0.62 + 0.38 * clamp(dot(n, normalize(vec3(-0.55, 0.45, 0.7))), 0.0, 1.0);
        vec3 col;
        if (abs(n.y) > 0.5) {
          col = wall * (n.y > 0.0 ? 0.5 : 0.3);  // roofs
        } else {
          vec3 uAxis = abs(n.x) > 0.5 ? vec3(0.0, 0.0, -sign(n.x)) : vec3(sign(n.z), 0.0, 0.0);
          float u = dot(vPos, uAxis);
          vec2 g = vec2(u / colW, vPos.y / rowH);
          vec2 cell = floor(g);
          vec2 f = fract(g);
          float win = step(x0, f.x) * step(f.x, x1) * step(y0, f.y) * step(f.y, y1);
          float hl = hash(cell + vSeed * 97.3);
          float isLit = step(1.0 - lit, hl);
          // a few rooms switch their lights on and off every so often
          if (hash(cell * 3.7 + vSeed * 5.1) < 0.05) isLit = step(0.45, hash(cell + floor(uTime / (7.0 + 12.0 * hl) + hl * 10.0)));
          float bright = 0.55 + 0.45 * hash(cell * 2.17 + 3.3);
          float lh = hash(cell * 1.31 + vSeed * 7.7);
          vec3 lc = roomLight(lh);
          if (lh >= 0.95) bright *= 0.6 + 0.4 * hash(vec2(floor(uTime * 7.0), cell.x + cell.y * 31.0)); // TV flicker
          #if TINTED
          lc = mix(uTint, roomLight(lh), 0.35 + 0.4 * hash(cell * 1.9));
          #endif
          vec3 winCol;
          #if INTERIORS
          vec3 d = vec3(dot(V, uAxis) / colW, V.y / rowH, dot(V, -n) / (colW * 1.3));
          winCol = room(f, d, cell, isLit, lc * bright, style);
          #else
          winCol = mix(vec3(0.03, 0.045, 0.08), lc * bright * (0.85 + 0.15 * sin(f.x * 3.14159)), isLit);
          #endif
          // glass: tinted, reflecting the sky/city more at grazing angles
          float gf = mix(fres, min(1.0, fres * 1.5 + 0.1), step(0.5, 1.0 - isLit));
          winCol = mix(winCol, refl, gf * (style == 0 ? 0.95 : 0.8));
          col = mix(wall * shade, winCol, win);
          if (style == 0) col = mix(col, refl * 0.6, (1.0 - win) * fres * 0.6); // glass spandrels
          col *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, 0.05, f.y));      // floor slab line
          if (style == 0) col = mix(col, vec3(0.13, 0.15, 0.19) * shade, step(fract(u / colW), 0.035) * 0.85); // mullions

          // shop fronts on the ground floor
          if (style != 0 && vPos.y < 3.4) {
            float seg = floor(u / 4.0);
            float fx = fract(u / 4.0);
            float shop = step(0.7, vPos.y) * step(vPos.y, 3.0) * step(0.08, fx) * step(fx, 0.92) * step(0.3, hash(vec2(seg, vSeed * 11.0)));
            vec3 sc = mix(vec3(1.0, 0.82, 0.58), vec3(0.45, 0.9, 1.0), step(0.62, hash(vec2(seg, vSeed * 13.0))));
            sc = mix(sc, vec3(1.0, 0.45, 0.72), step(0.88, hash(vec2(seg * 1.7, vSeed * 7.0))));
            vec3 shopCol;
            #if INTERIORS
            // a lit shop interior behind the display window, split by mullions
            vec2 sf = vec2(fx, (vPos.y - 0.7) / 2.3);
            vec3 sd = vec3(dot(V, uAxis) / 4.0, V.y / 2.3, dot(V, -n) / 5.0);
            shopCol = room(sf, sd, vec2(seg, 91.0), 1.0, sc * 0.9, 1);
            shopCol *= 1.0 - 0.7 * step(abs(fract(fx * 3.0) - 0.5), 0.02);
            #else
            shopCol = sc * (0.75 + 0.25 * smoothstep(0.7, 2.6, vPos.y));
            #endif
            col = mix(col, mix(shopCol, refl, fres * 0.5), shop);
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

// Night sky: gradient with a warm light-pollution glow on the horizon and slow-moving clouds lit from below by the city.
export function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTime: cityTime },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vDir;
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        float h = clamp(vDir.y, -0.1, 1.0);
        vec3 zenith = vec3(0.012, 0.018, 0.05);
        vec3 horizon = vec3(0.09, 0.08, 0.17);
        vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.55, h));
        col += vec3(0.35, 0.16, 0.10) * exp(-max(h, 0.0) * 14.0) * 0.55; // city light pollution
        if (h > 0.02) {
          // clouds on a flat layer above the city: project the view ray onto it
          vec2 uv = vDir.xz / (h + 0.12) * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
          float c = smoothstep(0.48, 0.78, fbm(uv));
          float under = exp(-h * 4.0); // lower clouds catch more of the orange city glow
          vec3 cloud = mix(vec3(0.05, 0.055, 0.09), vec3(0.32, 0.2, 0.15), under * 0.8);
          col = mix(col, cloud, c * smoothstep(0.02, 0.12, h) * 0.85);
        }
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
