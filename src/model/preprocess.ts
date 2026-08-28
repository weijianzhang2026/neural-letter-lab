/**
 * MNIST-style preprocessing: drawing canvas → 28×28 Float32Array (0..1).
 *
 * Ink lives in the ALPHA channel — the drawing canvas is transparent except
 * for strokes, so ink intensity is always alpha/255 (never RGB luminance).
 *
 * Steps: alpha bounding box → crop → resample so the longest side is ~20 px
 * (progressive drawImage halving for good quality) → paste into 28×28 with
 * the ink centre of mass at the centre → separable [1,2,1]/4 Gaussian blur →
 * normalize so the peak is exactly 1.
 */
import { GRID } from '../types';
import { EPS } from './conv';

/** Pixels with alpha above this count as ink. */
const INK_THRESHOLD = 0.08;
/** Below this total ink (≈ 4 fully-opaque pixels) the canvas counts as empty. */
const MIN_TOTAL_INK = 4;
/** Longest side of the cropped glyph after resampling. */
const TARGET_LONG_SIDE = 20;

/** Reusable scratch canvases for the progressive downscale (ping-pong). */
const scratch: Array<HTMLCanvasElement | null> = [null, null];

function getScratch(i: 0 | 1): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  let c = scratch[i];
  if (!c) {
    c = document.createElement('canvas');
    scratch[i] = c;
  }
  return c;
}

function get2d(c: HTMLCanvasElement): CanvasRenderingContext2D | null {
  return c.getContext('2d', { willReadFrequently: true });
}

/**
 * Crop `(sx, sy, sw, sh)` out of `source` and resample it to `tw × th`,
 * returning the alpha channel as floats in 0..1. Uses repeated halving via
 * drawImage so large downscales keep their strokes (single-step bilinear
 * would skip pixels at 600px → 20px).
 */
function resampleAlpha(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  tw: number,
  th: number,
): Float32Array | null {
  let curCanvas = source;
  let cx = sx;
  let cy = sy;
  let cw = sw;
  let ch = sh;
  let toggle: 0 | 1 = 0;

  const step = (nw: number, nh: number): boolean => {
    const dst = getScratch(toggle);
    if (!dst) return false;
    toggle = toggle === 0 ? 1 : 0;
    dst.width = nw; // resizing also clears the canvas
    dst.height = nh;
    const dctx = get2d(dst);
    if (!dctx) return false;
    dctx.clearRect(0, 0, nw, nh);
    dctx.imageSmoothingEnabled = true;
    dctx.imageSmoothingQuality = 'high';
    dctx.drawImage(curCanvas, cx, cy, cw, ch, 0, 0, nw, nh);
    curCanvas = dst;
    cx = 0;
    cy = 0;
    cw = nw;
    ch = nh;
    return true;
  };

  // Progressive halving until we are within 2× of the target size.
  while (cw > tw * 2 && ch > th * 2) {
    const nw = Math.max(tw, Math.round(cw / 2));
    const nh = Math.max(th, Math.round(ch / 2));
    if (!step(nw, nh)) return null;
  }
  if (!step(tw, th)) return null;

  const dctx = get2d(curCanvas);
  if (!dctx) return null;
  const img = dctx.getImageData(0, 0, tw, th);
  const out = new Float32Array(tw * th);
  for (let i = 0; i < out.length; i++) out[i] = img.data[i * 4 + 3] / 255;
  return out;
}

/** Separable 3×3 Gaussian blur ([1,2,1]/4 per axis, zero padding), in place. */
export function blur3x3(field: Float32Array, w: number, h: number): void {
  const tmp = new Float32Array(field.length);
  for (let y = 0; y < h; y++) {
    const off = y * w;
    for (let x = 0; x < w; x++) {
      const l = x > 0 ? field[off + x - 1] : 0;
      const r = x < w - 1 ? field[off + x + 1] : 0;
      tmp[off + x] = (l + 2 * field[off + x] + r) / 4;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = y > 0 ? tmp[(y - 1) * w + x] : 0;
      const d = y < h - 1 ? tmp[(y + 1) * w + x] : 0;
      field[y * w + x] = (u + 2 * tmp[y * w + x] + d) / 4;
    }
  }
}

/**
 * Pure second half of preprocessing (exported for testability):
 * paste a `tw × th` patch into the 28×28 field so its centre of mass lands at
 * the centre (shifts clamped to stay inside), blur, peak-normalize to 1.
 */
export function patchToInput(
  patch: Float32Array,
  tw: number,
  th: number,
): Float32Array | null {
  let sum = 0;
  let mx = 0;
  let my = 0;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const v = patch[y * tw + x];
      sum += v;
      mx += v * x;
      my += v * y;
    }
  }
  if (sum < EPS) return null;

  const centre = (GRID - 1) / 2; // 13.5
  let ox = Math.round(centre - mx / sum);
  let oy = Math.round(centre - my / sum);
  ox = Math.min(Math.max(ox, 0), Math.max(0, GRID - tw));
  oy = Math.min(Math.max(oy, 0), Math.max(0, GRID - th));

  const field = new Float32Array(GRID * GRID);
  const copyW = Math.min(tw, GRID);
  const copyH = Math.min(th, GRID);
  for (let y = 0; y < copyH; y++) {
    for (let x = 0; x < copyW; x++) {
      field[(oy + y) * GRID + ox + x] = patch[y * tw + x];
    }
  }

  blur3x3(field, GRID, GRID);

  let max = 0;
  for (let i = 0; i < field.length; i++) if (field[i] > max) max = field[i];
  if (max < EPS) return null;
  const inv = 1 / max;
  for (let i = 0; i < field.length; i++) field[i] *= inv;
  return field;
}

/**
 * Full preprocessing pipeline. Returns the 784-value input vector, or null
 * when the canvas is (nearly) empty or contexts are unavailable.
 */
export function preprocessCanvas(source: HTMLCanvasElement): Float32Array | null {
  const w = source.width;
  const h = source.height;
  if (w < 2 || h < 2) return null;
  const sctx = source.getContext('2d');
  if (!sctx) return null;

  const data = sctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let inkSum = 0;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const a = data[(row + x) * 4 + 3] / 255;
      if (a > INK_THRESHOLD) {
        inkSum += a;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || inkSum < MIN_TOTAL_INK) return null;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const scale = TARGET_LONG_SIDE / Math.max(bw, bh);
  const tw = Math.max(1, Math.min(TARGET_LONG_SIDE, Math.round(bw * scale)));
  const th = Math.max(1, Math.min(TARGET_LONG_SIDE, Math.round(bh * scale)));

  const patch = resampleAlpha(source, minX, minY, bw, bh, tw, th);
  if (!patch) return null;
  return patchToInput(patch, tw, th);
}
