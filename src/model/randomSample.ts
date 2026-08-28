/**
 * "Random letter" sample generator: draws a handwriting-looking letter onto
 * the drawing canvas. The glyph is rendered 2–3 times with tiny offset /
 * rotation / alpha jitter plus a few short overlay strokes anchored on the
 * ink, which gives a wobbly hand-drawn feel while staying recognizable.
 *
 * The ink lives in the alpha channel; the fill colour only matters for what
 * the user sees on the board.
 */
import { LETTERS } from '../types';
import type { InkMode } from '../types';
import { FONT_VARIANTS, fontString } from './templates';
import type { FontVariant } from './templates';

const LIGHT_INK = '#F8FAFC';
const DARK_INK = '#0B1020';

interface GlyphMetrics {
  /** Ink-box height per px of font size. */
  heightRatio: number;
  /** Ink-box width per px of font size. */
  widthRatio: number;
  /** Baseline offset (per px of font size) that vertically centres the ink box. */
  baselineRatio: number;
}

function measureGlyph(
  ctx: CanvasRenderingContext2D,
  letter: string,
  variant: FontVariant,
): GlyphMetrics {
  const trial = 100;
  ctx.font = fontString(variant, trial);
  const m = ctx.measureText(letter);

  const asc = Number.isFinite(m.actualBoundingBoxAscent)
    ? m.actualBoundingBoxAscent
    : trial * 0.72;
  const desc = Number.isFinite(m.actualBoundingBoxDescent)
    ? m.actualBoundingBoxDescent
    : trial * 0.04;
  const width =
    Number.isFinite(m.actualBoundingBoxLeft) &&
    Number.isFinite(m.actualBoundingBoxRight)
      ? m.actualBoundingBoxLeft + m.actualBoundingBoxRight
      : m.width;

  const h = Math.max(asc + desc, trial * 0.3);
  const w = Math.max(width, trial * 0.15);
  return {
    heightRatio: h / trial,
    widthRatio: w / trial,
    // Ink spans [baseline - asc, baseline + desc]; centre it on y = 0.
    baselineRatio: (asc - desc) / 2 / trial,
  };
}

/** A few short, slightly bent strokes anchored on existing ink. */
function addOverlayStrokes(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color: string,
  minDim: number,
): void {
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return;
  }

  // Sparse sampling of inked pixels — plenty of anchors, tiny cost.
  const stride = Math.max(2, Math.floor(minDim / 90));
  const points: number[] = [];
  for (let y = 0; y < h; y += stride) {
    const row = y * w;
    for (let x = 0; x < w; x += stride) {
      if (data[(row + x) * 4 + 3] > 110) points.push(x, y);
    }
  }
  if (points.length < 8) return;

  const count = 2 + Math.floor(Math.random() * 2); // 2–3 strokes
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, minDim * 0.012);
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < count; i++) {
    const pi = Math.floor(Math.random() * (points.length / 2)) * 2;
    const px = points[pi];
    const py = points[pi + 1];
    const ang = Math.random() * Math.PI * 2;
    const len = minDim * (0.02 + Math.random() * 0.025);
    const bend = (Math.random() * 2 - 1) * len * 0.4;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(px - (dx * len) / 2, py - (dy * len) / 2);
    ctx.quadraticCurveTo(
      px - dy * bend,
      py + dx * bend,
      px + (dx * len) / 2,
      py + (dy * len) / 2,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Clear the canvas and draw a random handwriting-looking letter filling
 * roughly 55–70% of the board. Returns the letter that was drawn.
 */
export function drawRandomLetter(canvas: HTMLCanvasElement, ink: InkMode): string {
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const ctx = canvas.getContext('2d');
  if (!ctx) return letter;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h); // keep the board transparent — ink is alpha
  if (w < 8 || h < 8) return letter;

  const minDim = Math.min(w, h);
  const variant = FONT_VARIANTS[Math.floor(Math.random() * FONT_VARIANTS.length)];
  const color = ink === 'light' ? LIGHT_INK : DARK_INK;

  // Size the glyph so its ink box fills ~55–70% of the board height,
  // clamped so wide letters (W, M) stay comfortably inside.
  const metrics = measureGlyph(ctx, letter, variant);
  const frac = 0.55 + Math.random() * 0.15;
  let fontSize = (minDim * frac) / metrics.heightRatio;
  const maxWidth = w * 0.82;
  if (metrics.widthRatio * fontSize > maxWidth) {
    fontSize = maxWidth / metrics.widthRatio;
  }

  const jitterRange = minDim * 0.04;
  const cx = w / 2 + (Math.random() * 2 - 1) * jitterRange;
  const cy = h / 2 + (Math.random() * 2 - 1) * jitterRange;
  const baseRotation = ((Math.random() * 16 - 8) * Math.PI) / 180; // ±8°
  const baselineShift = metrics.baselineRatio * fontSize;

  ctx.save();
  ctx.font = fontString(variant, fontSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;

  // 2–3 overlapping passes with small offset/rotation/alpha jitter.
  const passes = 2 + (Math.random() < 0.6 ? 1 : 0);
  for (let p = 0; p < passes; p++) {
    ctx.save();
    ctx.translate(
      cx + (Math.random() * 4 - 2),
      cy + (Math.random() * 4 - 2),
    );
    ctx.rotate(baseRotation + (Math.random() * 2 - 1) * 0.015);
    ctx.globalAlpha = 0.5 + Math.random() * 0.25;
    ctx.fillText(letter, 0, baselineShift);
    ctx.restore();
  }
  ctx.restore();

  addOverlayStrokes(ctx, w, h, color, minDim);
  return letter;
}
