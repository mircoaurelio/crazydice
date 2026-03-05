import * as THREE from 'three';

const DICE_SIZE = 1;
const RADIUS = 0.15;
const LIMIT = DICE_SIZE / 2 - RADIUS;

/** Rounded box geometry for dice (shared). */
export function createRoundedDiceGeometry(): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 8, 8, 8);
  const pos = geo.attributes.position;
  if (!pos) return geo;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const cx = Math.max(-LIMIT, Math.min(LIMIT, x));
    const cy = Math.max(-LIMIT, Math.min(LIMIT, y));
    const cz = Math.max(-LIMIT, Math.min(LIMIT, z));
    let dx = x - cx;
    let dy = y - cy;
    let dz = z - cz;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 0) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
      dz = (dz / len) * RADIUS;
    }
    pos.setXYZ(i, cx + dx, cy + dy, cz + dz);
  }
  geo.computeVertexNormals();
  return geo;
}

export const DICE_SIZE_HALF = DICE_SIZE / 2;
