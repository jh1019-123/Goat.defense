import * as THREE from 'three';

export function createCobblestoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base packed earth mortar
  ctx.fillStyle = '#2d2823';
  ctx.fillRect(0, 0, 512, 512);

  // Draw irregular stone cobbles
  const rows = 8;
  const cols = 6;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * cellW + offset + 4;
      const y = r * cellH + 4;
      const w = cellW - 8;
      const h = cellH - 8;

      const shade = 64 + ((r * 19 + c * 31) % 28);
      ctx.fillStyle = `rgb(${shade + 8}, ${shade + 4}, ${shade - 2})`;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();

      // Highlight bevel
      ctx.strokeStyle = 'rgba(255, 245, 225, 0.14)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // Subtle wagon wheel tracks down the lane
  ctx.fillStyle = 'rgba(18, 15, 12, 0.28)';
  ctx.fillRect(105, 0, 38, 512);
  ctx.fillRect(369, 0, 38, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCoordinateGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Subtle dark moss/slate turf tile
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#243529');
  grad.addColorStop(1, '#1d2b22');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle interior coordinate crosshair lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(128, 12);
  ctx.lineTo(128, 244);
  ctx.moveTo(12, 128);
  ctx.lineTo(244, 128);
  ctx.stroke();

  // Crisp outer coordinate border
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.42)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);

  // Corner coordinate ticks
  ctx.fillStyle = 'rgba(251, 191, 36, 0.55)';
  ctx.fillRect(6, 6, 12, 3);
  ctx.fillRect(6, 6, 3, 12);
  ctx.fillRect(238, 6, 12, 3);
  ctx.fillRect(247, 6, 3, 12);
  ctx.fillRect(6, 247, 12, 3);
  ctx.fillRect(6, 238, 3, 12);
  ctx.fillRect(238, 247, 12, 3);
  ctx.fillRect(247, 238, 3, 12);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCastleMasonryTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 4;
  const w = 512 / cols;
  const h = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (w * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 78 + ((r * 23 + c * 17) % 24);
      ctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 14})`;
      ctx.fillRect(c * w + offset + 3, r * h + 3, w - 6, h - 6);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
