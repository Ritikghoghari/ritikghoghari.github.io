import * as THREE from 'three';
import { cityTime } from './facade.js';

// Light rain: streaks in a box that follows the camera; the GPU moves and wraps them, so the CPU does nothing per frame.
export function buildRain(scene, { quality }) {
  const n = quality === 'high' ? 9000 : 3000;
  const BOX = new THREE.Vector3(70, 36, 70);
  const pos = new Float32Array(n * 2 * 3);
  const end = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const x = Math.random() * BOX.x;
    const y = Math.random() * BOX.y;
    const z = Math.random() * BOX.z;
    pos.set([x, y, z, x, y, z], i * 6);
    end[i * 2 + 1] = 1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const uniforms = {
    uTime: cityTime,
    uCam: { value: new THREE.Vector3() },
    uBox: { value: BOX },
    uAmount: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCam; uniform vec3 uBox;
      attribute float aEnd;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * 16.0, uBox.y);
        p.xz = mod(p.xz - uCam.xz + uBox.xz * 0.5 + uTime * vec2(1.2, 0.4), uBox.xz) - uBox.xz * 0.5 + uCam.xz;
        p += vec3(0.07, 0.75, 0.025) * aEnd; // streak length along the fall direction (slight wind)
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float d = -mv.z;
        vA = smoothstep(3.0, 9.0, d) * (1.0 - smoothstep(18.0, 34.0, d));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uAmount;
      varying float vA;
      void main() {
        gl_FragColor = vec4(vec3(0.62, 0.68, 0.8) * 0.16 * vA * uAmount, 1.0);
      }`,
  });
  const lines = new THREE.LineSegments(geo, mat);
  lines.frustumCulled = false;
  lines.renderOrder = 5;
  scene.add(lines);
  return {
    update(camera) {
      uniforms.uCam.value.copy(camera.position);
    },
    setOn(on) {
      lines.visible = on;
    },
  };
}
