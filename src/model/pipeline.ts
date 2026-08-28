/**
 * Public model engine entry point for Neural Letter Lab.
 *
 * `warmUp()` pre-builds the letter templates (idempotent).
 * `runPipeline(canvas)` preprocesses the drawing (ink = alpha channel), runs
 * the convolution/encoder/FC stages and the real template classifier, and
 * returns every artifact the visualization needs — or null when the canvas
 * is (nearly) empty.
 */
import type { PipelineArtifacts } from '../types';
import { runForward } from './forward';
import { preprocessCanvas } from './preprocess';
import { buildTemplates } from './templates';

/** Pre-build the A–Z letter templates. Safe to call multiple times. */
export function warmUp(): void {
  buildTemplates();
}

/**
 * Run the full recognition pipeline on the drawing canvas.
 * Returns null if there is no meaningful ink on the canvas.
 */
export function runPipeline(canvas: HTMLCanvasElement): PipelineArtifacts | null {
  const input = preprocessCanvas(canvas);
  if (!input) return null;
  // Templates are built lazily here if warmUp() was never called.
  return runForward(input, buildTemplates());
}
