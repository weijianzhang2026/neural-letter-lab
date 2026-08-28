/**
 * Fully-connected layers for the visualization.
 *
 * The weights are deterministic pseudo-random (seeded mulberry32) — they are
 * not trained, they exist to give the FC stage of the animation honest,
 * input-dependent activations in 0..1. The actual letter decision comes from
 * the template classifier.
 */
import { FC1_SIZE, FC2_SIZE, LATENT_SIZE } from '../types';
import { mulberry32 } from './rng';

const SEED = 42;
const WEIGHT_SCALE_NUMERATOR = 1.5;
const BIAS_RANGE = 0.2;

interface Layer {
  inSize: number;
  outSize: number;
  /** Row-major [outSize × inSize]. */
  w: Float32Array;
  b: Float32Array;
}

function makeLayer(rand: () => number, inSize: number, outSize: number): Layer {
  const scale = WEIGHT_SCALE_NUMERATOR / Math.sqrt(inSize);
  const w = new Float32Array(inSize * outSize);
  for (let i = 0; i < w.length; i++) w[i] = (rand() * 2 - 1) * scale;
  const b = new Float32Array(outSize);
  for (let i = 0; i < outSize; i++) b[i] = (rand() * 2 - 1) * BIAS_RANGE;
  return { inSize, outSize, w, b };
}

let layers: { l1: Layer; l2: Layer } | null = null;

function getLayers(): { l1: Layer; l2: Layer } {
  if (!layers) {
    const rand = mulberry32(SEED);
    layers = {
      l1: makeLayer(rand, LATENT_SIZE, FC1_SIZE),
      l2: makeLayer(rand, FC1_SIZE, FC2_SIZE),
    };
  }
  return layers;
}

/** out = (tanh(W·x + b) + 1) / 2 — squashed into 0..1 for display. */
function forwardLayer(layer: Layer, x: ArrayLike<number>): number[] {
  const out = new Array<number>(layer.outSize);
  for (let o = 0; o < layer.outSize; o++) {
    let z = layer.b[o];
    const off = o * layer.inSize;
    const n = Math.min(layer.inSize, x.length);
    for (let i = 0; i < n; i++) z += layer.w[off + i] * x[i];
    out[o] = (Math.tanh(z) + 1) / 2;
  }
  return out;
}

export function fcForward(latent: ArrayLike<number>): {
  fc1: number[];
  fc2: number[];
} {
  const { l1, l2 } = getLayers();
  const fc1 = forwardLayer(l1, latent);
  const fc2 = forwardLayer(l2, fc1);
  return { fc1, fc2 };
}
