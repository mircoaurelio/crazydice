import * as THREE from 'three';

export function createDiceTexture(
  number: number,
  isHover = false,
  highlightColorStr = '#ff6b6b',
  anisotropy = 1
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = isHover ? highlightColorStr : '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  ctx.lineWidth = 12;
  ctx.strokeStyle = isHover ? highlightColorStr : '#e2e8f0';
  ctx.strokeRect(15, 15, 226, 226);
  ctx.fillStyle = isHover ? '#ffffff' : '#2d3436';
  const drawDot = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };
  const center = 128;
  const offset = 65;
  if ([1, 3, 5].includes(number)) drawDot(center, center);
  if ([2, 3, 4, 5, 6].includes(number)) {
    drawDot(center - offset, center - offset);
    drawDot(center + offset, center + offset);
  }
  if ([4, 5, 6].includes(number)) {
    drawDot(center - offset, center + offset);
    drawDot(center + offset, center - offset);
  }
  if (number === 6) {
    drawDot(center - offset, center);
    drawDot(center + offset, center);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = anisotropy;
  return texture;
}

/** Soft radial gradient for paint-blob: dense in center, fades to fully transparent before the circle edge so no rim is visible. */
export function createPaintBlobTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, 'rgba(255,255,255,0.98)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(0.65, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(0.72, 'rgba(255,255,255,0)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/** Bonus face: same dot layout as normal dice but tinted by perk; dots in white for contrast. */
export function createBonusFaceTexture(
  faceValue: number,
  _perkId: string,
  colorStr: string,
  anisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = colorStr;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 0, 256, 256);
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#2d3436';
  ctx.strokeRect(15, 15, 226, 226);
  ctx.fillStyle = '#ffffff';
  const drawDot = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };
  const center = 128;
  const offset = 65;
  if ([1, 3, 5].includes(faceValue)) drawDot(center, center);
  if ([2, 3, 4, 5, 6].includes(faceValue)) {
    drawDot(center - offset, center - offset);
    drawDot(center + offset, center + offset);
  }
  if ([4, 5, 6].includes(faceValue)) {
    drawDot(center - offset, center + offset);
    drawDot(center + offset, center - offset);
  }
  if (faceValue === 6) {
    drawDot(center - offset, center);
    drawDot(center + offset, center);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = anisotropy;
  return texture;
}

export const COMBO_COLORS: Record<
  number,
  { hex: number; str: string }
> = {
  1: { hex: 0xff6b6b, str: '#ff6b6b' },
  2: { hex: 0xf39c12, str: '#f39c12' },
  3: { hex: 0xf1c40f, str: '#f1c40f' },
  4: { hex: 0x2ecc71, str: '#2ecc71' },
  5: { hex: 0x3498db, str: '#3498db' },
  6: { hex: 0x9b59b6, str: '#9b59b6' },
};
