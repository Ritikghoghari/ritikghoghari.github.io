import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { cityTime } from './facade.js';

// Wet asphalt after rain: puddles that mirror the city, damp road that smears lights into streaks,
// rain ripples. With `mirror` (desktop) the road gets a real planar reflection of the scene;
// otherwise street-lamp reflections are computed analytically, which is far cheaper on phones.
const vertexShader = /* glsl */ `
  uniform mat4 textureMatrix;
  uniform vec2 uRepeat;
  varying vec4 vRefl; varying vec2 vTex; varying vec3 vWorld; varying float vDepth;
  void main() {
    vRefl = textureMatrix * vec4(position, 1.0);
    vTex = uv * uRepeat;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mv = viewMatrix * wp;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform sampler2D tDiffuse;
  uniform sampler2D tMap;
  uniform vec3 uFog; uniform float uDensity; uniform float uTime; uniform float uRain;
  uniform vec4 uLamps; // first lamp z (left side), spacing, x of left lamps, x offset of right lamps' z
  varying vec4 vRefl; varying vec2 vTex; varying vec3 vWorld; varying float vDepth;

  float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  // expanding rings where raindrops hit; returns a small normal offset in xz
  vec2 ripple(vec2 p) {
    vec2 c = floor(p / 0.8);
    float h = hash(c);
    vec2 ctr = (c + 0.2 + 0.6 * vec2(h, hash(c + 7.1))) * 0.8;
    float ph = fract(uTime * (0.8 + 0.6 * h) + h * 13.0);
    vec2 d = p - ctr;
    float l = length(d) + 1e-4;
    float ring = exp(-pow((l - ph * 0.36) * 38.0, 2.0)) * (1.0 - ph);
    return d / l * ring;
  }

  vec3 skyRefl(vec3 r) {
    vec3 c = mix(vec3(0.09, 0.08, 0.16), vec3(0.012, 0.018, 0.05), smoothstep(0.0, 0.55, r.y));
    return c + vec3(0.35, 0.16, 0.10) * exp(-max(r.y, 0.0) * 14.0) * 0.55;
  }

  float lampGlow(vec3 P, vec3 R, vec3 L, float sharp) {
    vec3 d = normalize(L - P);
    return pow(max(dot(R, d), 0.0), sharp) * (1.0 / (1.0 + 0.002 * dot(L - P, L - P)));
  }

  void main() {
    vec2 xz = vWorld.xz;
    // puddles: low-frequency noise thresholded; the rest of the road is just damp
    float n = noise(xz * 0.22) * 0.65 + noise(xz * 0.9) * 0.35;
    float puddle = smoothstep(0.52, 0.6, n);
    float wet = mix(0.45, 1.0, puddle);

    vec2 rip = (ripple(xz) + ripple(xz + 0.4) * 0.6) * uRain * 0.3;
    vec2 wobble = (vec2(noise(xz * 3.0), noise(xz * 3.0 + 9.0)) - 0.5) * (1.0 - puddle) * 0.06;

    vec3 base = texture2D(tMap, vTex).rgb;
    base *= mix(1.0, 0.55, wet);      // wet asphalt is darker

    vec3 V = normalize(vWorld - cameraPosition);
    float fres = 0.03 + 0.97 * pow(1.0 - clamp(-V.y, 0.0, 1.0), 5.0);
    vec3 N = normalize(vec3(rip.x * 0.6 + wobble.x, 1.0, rip.y * 0.6 + wobble.y));
    vec3 R = reflect(V, N);

    vec3 refl;
    #ifdef USE_MIRROR
    // blur the reflection vertically on damp patches: lights smear into long streaks
    vec4 uv = vRefl;
    uv.xy += (N.xz * 0.9) * uv.w;
    float spread = (1.0 - puddle) * 0.018 * uv.w;
    refl = texture2DProj(tDiffuse, uv).rgb * 0.36;
    refl += texture2DProj(tDiffuse, uv + vec4(0.0, spread, 0.0, 0.0)).rgb * 0.22;
    refl += texture2DProj(tDiffuse, uv - vec4(0.0, spread, 0.0, 0.0)).rgb * 0.22;
    refl += texture2DProj(tDiffuse, uv + vec4(0.0, spread * 2.2, 0.0, 0.0)).rgb * 0.1;
    refl += texture2DProj(tDiffuse, uv - vec4(0.0, spread * 2.2, 0.0, 0.0)).rgb * 0.1;
    #else
    refl = skyRefl(R);
    // nearest street lamps on both sides of the avenue
    float sharp = mix(90.0, 900.0, puddle);
    vec3 warm = vec3(1.0, 0.82, 0.55);
    float k0 = floor((uLamps.x - vWorld.z) / uLamps.y);
    for (int i = -1; i <= 2; i++) {
      float zl = uLamps.x - (k0 + float(i)) * uLamps.y;
      refl += warm * 3.0 * lampGlow(vWorld, R, vec3(-uLamps.z, 6.9, zl), sharp);
      refl += warm * 3.0 * lampGlow(vWorld, R, vec3(uLamps.z, 6.9, zl - uLamps.w), sharp);
    }
    #endif

    float amount = wet * (0.25 + 0.75 * fres);
    vec3 col = mix(base * 0.42, refl, amount);
    float fog = 1.0 - exp(-uDensity * uDensity * vDepth * vDepth);
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
    #include <colorspace_fragment>
  }`;

export function wetRoadMaterialOptions({ map, repeat, fog, density, lamps, mirror }) {
  return {
    name: 'WetRoad',
    defines: mirror ? { USE_MIRROR: '' } : {},
    uniforms: {
      color: { value: null },
      tDiffuse: { value: null },
      textureMatrix: { value: new THREE.Matrix4() },
      tMap: { value: map },
      uRepeat: { value: repeat },
      uFog: { value: fog },
      uDensity: { value: density },
      uTime: cityTime,
      uRain: { value: 1 },
      uLamps: { value: new THREE.Vector4(...lamps) },
    },
    vertexShader,
    fragmentShader,
  };
}

// The wet avenue. Returns the mesh; with `mirror` it is a Reflector rendering at `mirrorScale` of the screen size.
export function wetRoad(geometry, opts) {
  const shader = wetRoadMaterialOptions(opts);
  if (opts.mirror) {
    const scale = (opts.mirrorScale ?? 0.5) * Math.min(window.devicePixelRatio || 1, 1.5);
    const mesh = new Reflector(geometry, {
      shader,
      textureWidth: Math.round(window.innerWidth * scale),
      textureHeight: Math.round(window.innerHeight * scale),
      clipBias: 0.003,
      multisample: 0,
    });
    // Reflector clones uniforms; re-link the shared ones and the defines
    const u = mesh.material.uniforms;
    u.uTime = cityTime;
    u.tMap.value = opts.map;
    mesh.material.defines = shader.defines;
    mesh.material.needsUpdate = true;
    return mesh;
  }
  const mat = new THREE.ShaderMaterial(shader);
  mat.uniforms.textureMatrix.value.identity();
  return new THREE.Mesh(geometry, mat);
}
