import * as THREE from 'three';

/** Keep blob round with a very subtle wobble so it reads as a circle. */
export function updateBlobDeform(blob: THREE.Mesh, elapsed: number): void {
  const geo = blob.geometry;
  const posAttr = geo.getAttribute('position');
  if (!posAttr?.array) return;
  const pos = posAttr.array as Float32Array;
  const count = posAttr.count;
  const radiusBase = 1.5;
  const rimCount = Math.max(1, count - 2);
  for (let i = 1; i < count; i++) {
    const angle = ((i - 1) / rimCount) * Math.PI * 2;
    const t = elapsed * 1.8 + angle;
    const wobble = 1 + 0.015 * Math.sin(t * 2);
    const r = radiusBase * wobble;
    pos[i * 3] = Math.cos(angle) * r;
    pos[i * 3 + 1] = Math.sin(angle) * r;
    pos[i * 3 + 2] = 0;
  }
  posAttr.needsUpdate = true;
}
