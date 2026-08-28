/**
 * Fixed educational 3×3 convolution kernels (row-major, 9 values each).
 * These are real, classic image-processing kernels — the conv stages of the
 * visualization show their genuine responses.
 */
export interface ConvKernel {
  name: string;
  /** 9 values, row-major 3×3 */
  values: Float32Array;
}

export const KERNELS: ReadonlyArray<ConvKernel> = [
  {
    name: 'Sobel X',
    values: Float32Array.from([-1, 0, 1, -2, 0, 2, -1, 0, 1]),
  },
  {
    name: 'Sobel Y',
    values: Float32Array.from([-1, -2, -1, 0, 0, 0, 1, 2, 1]),
  },
  {
    name: 'Diag ↘',
    values: Float32Array.from([2, 1, 0, 1, 0, -1, 0, -1, -2]),
  },
  {
    name: 'Diag ↗',
    values: Float32Array.from([0, 1, 2, -1, 0, 1, -2, -1, 0]),
  },
  {
    name: 'Laplacian',
    values: Float32Array.from([0, 1, 0, 1, -4, 1, 0, 1, 0]),
  },
  {
    name: 'Smooth',
    values: Float32Array.from([1, 2, 1, 2, 4, 2, 1, 2, 1].map((v) => v / 16)),
  },
];
