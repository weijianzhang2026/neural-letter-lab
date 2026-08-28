/**
 * Real classifier: cosine similarity of the preprocessed drawing against the
 * font-rendered letter templates, sharpened into a softmax distribution.
 */
import { LETTERS } from '../types';
import type { Prediction } from '../types';
import { dot, l2Normalize, softmax } from './conv';
import type { LetterTemplate } from './templates';

/**
 * Softmax temperature: probs = softmax(cosine scores × SHARPNESS).
 * Tuned so a cleanly drawn letter typically lands at 50–95% top-1 with a
 * meaningful top-3, instead of 99.99% certainty or a flat distribution.
 * (Sane range for this matcher is roughly 14–24.)
 */
export const SHARPNESS = 20;

export interface ClassifyResult {
  /** 26 probabilities (A..Z), sums to ~1, always finite. */
  probs: number[];
  /** Top 3 predictions sorted by prob, descending. */
  top: Prediction[];
}

export function classify(
  input: Float32Array,
  templates: ReadonlyArray<LetterTemplate>,
): ClassifyResult {
  const unit = l2Normalize(input);

  // Per letter: best cosine similarity over all of its font variants.
  const scores = new Array<number>(LETTERS.length).fill(0);
  for (const t of templates) {
    const s = dot(unit, t.vec);
    if (s > scores[t.letterIndex]) scores[t.letterIndex] = s;
  }

  const probs = softmax(scores.map((s) => s * SHARPNESS));

  const order = probs
    .map((_, i) => i)
    .sort((a, b) => probs[b] - probs[a]);
  const top: Prediction[] = order
    .slice(0, 3)
    .map((i) => ({ letter: LETTERS[i], prob: probs[i] }));

  return { probs, top };
}
