/**
 * Pure forward pass: preprocessed 28×28 input → full PipelineArtifacts.
 * DOM-free (templates are passed in), so it is testable headlessly and stays
 * comfortably under a millisecond per run.
 */
import {
  CONV1_COUNT,
  CONV2_COUNT,
  GRID,
  LATENT_SIZE,
} from '../types';
import type { FeatureMap, PipelineArtifacts } from '../types';
import { absInPlace, convolve3x3, EPS, maxPool2x2, normalize01 } from './conv';
import { classify } from './classifier';
import { fcForward } from './fc';
import { KERNELS } from './kernels';
import type { LetterTemplate } from './templates';

export function runForward(
  input: Float32Array,
  templates: ReadonlyArray<LetterTemplate>,
): PipelineArtifacts {
  // --- Conv layer 1: fixed 3×3 kernels on the 28×28 input (zero padding) ---
  const conv1Raw: Float32Array[] = [];
  const conv1: FeatureMap[] = [];
  for (let i = 0; i < CONV1_COUNT; i++) {
    const kernel = KERNELS[i % KERNELS.length];
    const response = absInPlace(convolve3x3(input, GRID, kernel.values));
    conv1Raw.push(response);
    conv1.push({
      size: GRID,
      data: normalize01(response),
      kernelName: kernel.name,
    });
  }

  // --- Conv layer 2: 2×2 max-pool to 14×14, then a rotated kernel pick ----
  const half = GRID >> 1; // 14
  const conv2Raw: Float32Array[] = [];
  const conv2: FeatureMap[] = [];
  for (let i = 0; i < CONV2_COUNT; i++) {
    const pooled = maxPool2x2(conv1Raw[i % conv1Raw.length], GRID);
    const kernel = KERNELS[(i + 2) % KERNELS.length];
    const response = absInPlace(convolve3x3(pooled, half, kernel.values));
    conv2Raw.push(response);
    conv2.push({
      size: half,
      data: normalize01(response),
      kernelName: kernel.name,
    });
  }

  // --- Encoder: pool to 7×7, then 4 quadrant means per map → 24 values ----
  const quarter = half >> 1; // 7
  const splitAt = Math.ceil(quarter / 2); // 4
  const latentRaw: number[] = [];
  for (const response of conv2Raw) {
    const pooled = maxPool2x2(response, half); // 7×7
    for (let qy = 0; qy < 2; qy++) {
      const y0 = qy === 0 ? 0 : splitAt;
      const y1 = qy === 0 ? splitAt : quarter;
      for (let qx = 0; qx < 2; qx++) {
        const x0 = qx === 0 ? 0 : splitAt;
        const x1 = qx === 0 ? splitAt : quarter;
        let sum = 0;
        let count = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            sum += pooled[y * quarter + x];
            count++;
          }
        }
        latentRaw.push(count > 0 ? sum / count : 0);
      }
    }
  }

  // Normalize the latent vector to 0..1 (guard against an all-zero map set).
  let latentMax = 0;
  for (const v of latentRaw) if (v > latentMax) latentMax = v;
  const latent = new Array<number>(LATENT_SIZE).fill(0);
  const n = Math.min(LATENT_SIZE, latentRaw.length);
  if (latentMax > EPS) {
    for (let i = 0; i < n; i++) latent[i] = latentRaw[i] / latentMax;
  }

  // --- FC visualization layers + real template classification -------------
  const { fc1, fc2 } = fcForward(latent);
  const { probs, top } = classify(input, templates);

  return { input, conv1, conv2, latent, fc1, fc2, probs, top };
}
