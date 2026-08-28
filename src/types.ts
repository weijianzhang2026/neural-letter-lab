/**
 * Shared contract for Neural Letter Lab.
 * Every module (model engine, input/result panels, network scene, App)
 * codes against the types in this file. Do not change shapes casually —
 * multiple components depend on them.
 */
import type { RefObject } from 'react';

export const GRID = 28;
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export const CONV1_COUNT = 6;
export const CONV2_COUNT = 6;
export const LATENT_SIZE = 24;
export const FC1_SIZE = 16;
export const FC2_SIZE = 12;

/** 'light' = white strokes on a dark board, 'dark' = dark strokes on a light board. */
export type InkMode = 'light' | 'dark';

export interface FeatureMap {
  /** width = height */
  size: number;
  /** length size*size, row-major (y * size + x), values normalized to 0..1 for display */
  data: Float32Array;
  /** e.g. "Sobel X" */
  kernelName: string;
}

export interface Prediction {
  letter: string;
  prob: number;
}

/** Everything the model computes for one recognition run. */
export interface PipelineArtifacts {
  /** GRID*GRID preprocessed ink intensities, 0..1 */
  input: Float32Array;
  /** CONV1_COUNT maps of size GRID (28) */
  conv1: FeatureMap[];
  /** CONV2_COUNT maps of size GRID/2 (14) */
  conv2: FeatureMap[];
  /** LATENT_SIZE values 0..1 */
  latent: number[];
  /** FC1_SIZE values 0..1 */
  fc1: number[];
  /** FC2_SIZE values 0..1 */
  fc2: number[];
  /** 26 softmax probabilities (A..Z), sums to ~1 */
  probs: number[];
  /** top 3 predictions, sorted desc by prob */
  top: Prediction[];
}

// ---------------------------------------------------------------------------
// Animation phases
// ---------------------------------------------------------------------------

export type Phase =
  | 'idle'
  | 'input'
  | 'conv1'
  | 'conv2'
  | 'encode'
  | 'fc'
  | 'output'
  | 'done';

export const PHASE_ORDER: Phase[] = [
  'idle',
  'input',
  'conv1',
  'conv2',
  'encode',
  'fc',
  'output',
  'done',
];

/** How long the pipeline lingers on each phase, in ms. */
export const PHASE_DURATION: Record<Phase, number> = {
  idle: 0,
  input: 900,
  conv1: 1500,
  conv2: 1200,
  encode: 1100,
  fc: 1100,
  output: 900,
  done: 0,
};

export function phaseRank(p: Phase): number {
  return PHASE_ORDER.indexOf(p);
}

export type StageStatus = 'pending' | 'active' | 'done';

/** Status of a stage whose phase is `stagePhase` while the pipeline is at `current`. */
export function stageStatus(stagePhase: Phase, current: Phase): StageStatus {
  const s = phaseRank(stagePhase);
  const c = phaseRank(current);
  if (c < s) return 'pending';
  if (c === s) return 'active';
  return 'done';
}

export interface StageInfo {
  id: string;
  index: number;
  title: string;
  phase: Phase;
  /** Educational one-liner shown with the stage. */
  blurb: string;
}

export const STAGES: StageInfo[] = [
  {
    id: 'pixels',
    index: 1,
    title: 'Pixel Grid',
    phase: 'input',
    blurb: 'Your drawing is converted into numerical pixel values.',
  },
  {
    id: 'conv1',
    index: 2,
    title: 'Convolution 1',
    phase: 'conv1',
    blurb: 'The model scans small areas of the image to detect edges, curves and shapes.',
  },
  {
    id: 'conv2',
    index: 3,
    title: 'Convolution 2',
    phase: 'conv2',
    blurb: 'Deeper filters combine simple edges into corners, loops and longer strokes.',
  },
  {
    id: 'encoder',
    index: 4,
    title: 'Encoder',
    phase: 'encode',
    blurb: 'The model compresses important visual features into a compact representation.',
  },
  {
    id: 'fc',
    index: 5,
    title: 'Fully Connected',
    phase: 'fc',
    blurb: 'The model compares the extracted features with learned letter patterns.',
  },
  {
    id: 'output',
    index: 6,
    title: 'Output A–Z',
    phase: 'output',
    blurb: 'The model selects the most likely letter from A to Z.',
  },
];

// ---------------------------------------------------------------------------
// Component prop contracts
// ---------------------------------------------------------------------------

export interface DrawingCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** Visual theme of strokes/board. Strokes always carry the ink in the alpha channel. */
  ink: InkMode;
  disabled?: boolean;
  onStrokeEnd?: () => void;
}

export interface ControlPanelProps {
  running: boolean;
  hasResult: boolean;
  ink: InkMode;
  particles: boolean;
  onClear: () => void;
  onRecognise: () => void;
  onRandom: () => void;
  onReplay: () => void;
  onInkChange: (m: InkMode) => void;
  onParticlesChange: (v: boolean) => void;
}

export interface PixelGridPreviewProps {
  matrix: Float32Array | null;
  status: StageStatus;
}

export interface NetworkSceneProps {
  artifacts: PipelineArtifacts | null;
  phase: Phase;
  particles: boolean;
}

export interface ResultPanelProps {
  artifacts: PipelineArtifacts | null;
  phase: Phase;
  /** Transient warning, e.g. "draw a letter first". Shown when non-null. */
  notice: string | null;
}
