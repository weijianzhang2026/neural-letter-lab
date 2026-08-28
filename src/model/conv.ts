/**
 * Pure numeric helpers: convolution, pooling, normalization, vector math.
 * No DOM access — everything in this module is unit-testable in isolation.
 */

export const EPS = 1e-6;

/**
 * 3×3 cross-correlation ("convolution" in CNN parlance) with zero padding.
 * `src` is a square map of side `size`; the output has the same size.
 */
export function convolve3x3(
  src: Float32Array,
  size: number,
  kernel: ArrayLike<number>,
): Float32Array {
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= size) continue;
        const rowOff = yy * size;
        const kOff = (dy + 1) * 3;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= size) continue;
          acc += src[rowOff + xx] * kernel[kOff + dx + 1];
        }
      }
      out[y * size + x] = acc;
    }
  }
  return out;
}

/** Absolute value, in place (captures both polarities of an edge response). */
export function absInPlace(a: Float32Array): Float32Array {
  for (let i = 0; i < a.length; i++) a[i] = Math.abs(a[i]);
  return a;
}

/** 2×2 max-pool of a square map with even side `size` → side `size/2`. */
export function maxPool2x2(src: Float32Array, size: number): Float32Array {
  const half = size >> 1;
  const out = new Float32Array(half * half);
  for (let y = 0; y < half; y++) {
    for (let x = 0; x < half; x++) {
      const i0 = y * 2 * size + x * 2;
      const i1 = i0 + size;
      let m = src[i0];
      if (src[i0 + 1] > m) m = src[i0 + 1];
      if (src[i1] > m) m = src[i1];
      if (src[i1 + 1] > m) m = src[i1 + 1];
      out[y * half + x] = m;
    }
  }
  return out;
}

/** Copy scaled so the maximum becomes 1. All-zero input stays all-zero. */
export function normalize01(src: Float32Array): Float32Array {
  let max = 0;
  for (let i = 0; i < src.length; i++) if (src[i] > max) max = src[i];
  const out = new Float32Array(src.length);
  if (max > EPS) {
    const inv = 1 / max;
    for (let i = 0; i < src.length; i++) out[i] = src[i] * inv;
  }
  return out;
}

/** Copy scaled to unit L2 norm. Near-zero input returns all zeros. */
export function l2Normalize(src: Float32Array): Float32Array {
  let ss = 0;
  for (let i = 0; i < src.length; i++) ss += src[i] * src[i];
  const out = new Float32Array(src.length);
  const norm = Math.sqrt(ss);
  if (norm > EPS) {
    const inv = 1 / norm;
    for (let i = 0; i < src.length; i++) out[i] = src[i] * inv;
  }
  return out;
}

export function dot(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** Numerically-safe softmax; always returns finite values summing to ~1. */
export function softmax(scores: number[]): number[] {
  const n = scores.length;
  if (n === 0) return [];
  let max = -Infinity;
  for (const s of scores) {
    if (Number.isFinite(s) && s > max) max = s;
  }
  if (!Number.isFinite(max)) return scores.map(() => 1 / n);
  const exps = scores.map((s) => (Number.isFinite(s) ? Math.exp(s - max) : 0));
  let sum = 0;
  for (const e of exps) sum += e;
  if (sum < EPS) return scores.map(() => 1 / n);
  return exps.map((e) => e / sum);
}
