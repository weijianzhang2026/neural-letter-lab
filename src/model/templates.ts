/**
 * Letter templates for the real classifier.
 *
 * Each uppercase letter A–Z is rendered in several macOS-present font
 * families (normal + bold where the family sensibly has a bold face), pushed
 * through the exact same preprocessing as user drawings, then L2-normalized.
 * Missing fonts silently fall back to the browser default — the resulting
 * duplicate templates are harmless.
 */
import { LETTERS } from '../types';
import { l2Normalize } from './conv';
import { preprocessCanvas } from './preprocess';

export interface FontVariant {
  family: string;
  weight: 'normal' | 'bold';
}

export interface LetterTemplate {
  letter: string;
  /** Index into LETTERS (0 = A). */
  letterIndex: number;
  /** L2-normalized 784-value preprocessed glyph. */
  vec: Float32Array;
}

const FAMILIES: ReadonlyArray<{ family: string; hasBold: boolean }> = [
  { family: 'Helvetica', hasBold: true },
  { family: 'Arial', hasBold: true },
  { family: 'Georgia', hasBold: true },
  { family: 'Times New Roman', hasBold: true },
  { family: 'Courier New', hasBold: true },
  { family: 'Verdana', hasBold: true },
  { family: 'Trebuchet MS', hasBold: true },
  { family: 'Comic Sans MS', hasBold: true },
  { family: 'Marker Felt', hasBold: false },
  { family: 'Bradley Hand', hasBold: false },
];

/** All font variants used for templates (and for random sample letters). */
export const FONT_VARIANTS: ReadonlyArray<FontVariant> = FAMILIES.flatMap(
  ({ family, hasBold }): FontVariant[] =>
    hasBold
      ? [
          { family, weight: 'normal' },
          { family, weight: 'bold' },
        ]
      : [{ family, weight: 'normal' }],
);

export function fontString(variant: FontVariant, sizePx: number): string {
  return `${variant.weight} ${sizePx}px "${variant.family}"`;
}

const TEMPLATE_CANVAS_SIZE = 200;
const TEMPLATE_FONT_SIZE = 140;

let cache: LetterTemplate[] | null = null;

/**
 * Build (or return the cached) template set. Idempotent; takes a few hundred
 * milliseconds the first time, instant afterwards.
 */
export function buildTemplates(): LetterTemplate[] {
  if (cache) return cache;
  if (typeof document === 'undefined') return [];

  const cv = document.createElement('canvas');
  cv.width = TEMPLATE_CANVAS_SIZE;
  cv.height = TEMPLATE_CANVAS_SIZE;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#000'; // colour is irrelevant — the ink is the alpha channel

  const built: LetterTemplate[] = [];
  for (let li = 0; li < LETTERS.length; li++) {
    const letter = LETTERS[li];
    for (const variant of FONT_VARIANTS) {
      ctx.clearRect(0, 0, TEMPLATE_CANVAS_SIZE, TEMPLATE_CANVAS_SIZE);
      ctx.font = fontString(variant, TEMPLATE_FONT_SIZE);
      ctx.fillText(letter, TEMPLATE_CANVAS_SIZE / 2, TEMPLATE_CANVAS_SIZE / 2);
      const vec = preprocessCanvas(cv);
      if (vec) built.push({ letter, letterIndex: li, vec: l2Normalize(vec) });
    }
  }

  // Only cache a usable set, so a transient failure can be retried later.
  if (built.length > 0) cache = built;
  return built;
}
