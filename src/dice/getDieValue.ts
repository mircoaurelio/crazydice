import * as THREE from 'three';
import type { DieFaceValue } from '../types';

const FACES: Array<{ vec: THREE.Vector3; val: DieFaceValue }> = [
  { vec: new THREE.Vector3(1, 0, 0), val: 3 },
  { vec: new THREE.Vector3(-1, 0, 0), val: 4 },
  { vec: new THREE.Vector3(0, 1, 0), val: 1 },
  { vec: new THREE.Vector3(0, -1, 0), val: 6 },
  { vec: new THREE.Vector3(0, 0, 1), val: 2 },
  { vec: new THREE.Vector3(0, 0, -1), val: 5 },
];

/** Returns the face value (1–6) of a d6 mesh based on its rotation (which face is up). */
export function getDieValue(mesh: THREE.Mesh): DieFaceValue {
  let maxDot = -Infinity;
  let value: DieFaceValue = 1;
  for (const f of FACES) {
    const dot = f.vec.clone().applyEuler(mesh.rotation).y;
    if (dot > maxDot) {
      maxDot = dot;
      value = f.val;
    }
  }
  return value;
}

/** Quaternion that makes the given face value (1–6) point up (for setting a die to a specific face). */
export function getQuaternionForFaceValue(value: number): THREE.Quaternion {
  const euler = new THREE.Euler(0, 0, 0);
  switch (value) {
    case 6: euler.x = Math.PI; break;
    case 3: euler.z = -Math.PI / 2; break;
    case 4: euler.z = Math.PI / 2; break;
    case 2: euler.x = -Math.PI / 2; break;
    case 5: euler.x = Math.PI / 2; break;
    case 1:
    default: break;
  }
  return new THREE.Quaternion().setFromEuler(euler);
}
