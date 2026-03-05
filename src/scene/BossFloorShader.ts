import * as THREE from 'three';
import type { ShaderMaterialParameters } from 'three';

/** Boss fight floor: dark red/purple with pulsing veins and hex pattern. */
export const BOSS_FLOOR_UNIFORMS = {
  uTime: { value: 0 },
  uFresnel: { value: 0.4 },
};

export const BOSS_FLOOR_VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const BOSS_FLOOR_FRAGMENT = `
  uniform float uTime;
  uniform float uFresnel;
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  float hexDist(vec2 p) {
    p = abs(p);
    float c = dot(p, normalize(vec2(1.0, 1.732)));
    c = max(c, p.x);
    return c;
  }

  float hexGrid(vec2 uv, float scale) {
    vec2 g = vec2(1.732, 1.0);
    vec2 id = floor(uv * scale);
    vec2 f = fract(uv * scale) - 0.5;
    float d = hexDist(f);
    float d2 = hexDist(f - vec2(1.0, 0.0));
    return min(d, d2);
  }

  void main() {
    vec2 uv = vUv * 12.0;
    float grid = hexGrid(vWorldPosition.xz * 0.15, 1.0);
    float line = 1.0 - smoothstep(0.0, 0.08, grid);
    float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + vWorldPosition.x * 0.5 + vWorldPosition.z * 0.3);
    float vein = 0.3 + 0.7 * smoothstep(0.4, 0.6, pulse) * (1.0 - line);
    vec3 dark = vec3(0.08, 0.02, 0.06);
    vec3 red = vec3(0.45, 0.05, 0.12);
    vec3 veinColor = mix(red, vec3(0.7, 0.1, 0.2), 0.3);
    vec3 base = mix(dark, red * 0.6, 0.2 + 0.1 * sin(uTime * 0.8));
    vec3 col = mix(base, veinColor, vein * line);
    col = mix(col, vec3(0.6, 0.05, 0.15), line * 0.5 * (0.6 + 0.4 * sin(uTime * 3.0)));
    float alpha = 1.0;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createBossFloorMaterial(
  params: Partial<ShaderMaterialParameters> = {}
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: BOSS_FLOOR_UNIFORMS,
    vertexShader: BOSS_FLOOR_VERTEX,
    fragmentShader: BOSS_FLOOR_FRAGMENT,
    transparent: false,
    depthWrite: true,
    ...params,
  });
}
