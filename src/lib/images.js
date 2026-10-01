import { api } from './api.js';

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Reduz e converte a imagem no navegador antes de enviar (fotos de celular chegam com 5–10 MB).
 * `square` corta no centro (favicon); `keepAlpha` preserva transparência (logo).
 */
export async function prepareImage(file, { max = 1600, square = false, keepAlpha = false } = {}) {
  if (!file?.type?.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  if (file.size > 30_000_000) throw new Error('Essa imagem é grande demais (máximo 30 MB).');

  const img = await loadImage(file);
  const width = img.naturalWidth || 512;
  const height = img.naturalHeight || 512;
  let [sx, sy, sw, sh] = [0, 0, width, height];
  if (square) {
    const side = Math.min(width, height);
    [sx, sy, sw, sh] = [(width - side) / 2, (height - side) / 2, side, side];
  }
  const scale = Math.min(1, max / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  // WebP quando o navegador sabe gerar (com transparência inclusive); senão PNG/JPEG.
  const webp = await toBlob(canvas, 'image/webp', keepAlpha ? 0.9 : 0.82);
  if (webp?.type === 'image/webp') return webp;
  return keepAlpha ? toBlob(canvas, 'image/png') : toBlob(canvas, 'image/jpeg', 0.85);
}

export async function uploadImage(file, options) {
  const blob = await prepareImage(file, options);
  const { url } = await api.upload('media', blob);
  return url;
}
