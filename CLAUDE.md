# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Neural Letter Lab: a single-page React app that lets a user hand-draw a capital letter (A–Z) on a canvas and watch an animated "neural network" visualization classify it. It is entirely client-side — no backend, no build-time data, no network calls.

## Commands

```bash
npm install        # install dependencies
npm run dev        # start Vite dev server
npm run build      # tsc --noEmit, then vite build
npm run typecheck   # tsc --noEmit only
npm run preview     # preview a production build
```

There is no lint script and no test runner configured in this repo.

## Architecture

### The core insight: visualization vs. classification are two separate paths

The animated "network" (input → conv1 → conv2 → encoder → fc → output) shown on screen is **purely illustrative** — it does not drive the prediction:

- `src/model/forward.ts` computes `conv1`, `conv2`, `latent`, `fc1`, `fc2` using real convolution/pooling math (`src/model/conv.ts`, fixed kernels in `src/model/kernels.ts`) and a fixed, *untrained*, seeded-random FC network (`src/model/fc.ts`). These values exist only to animate honestly input-dependent activations.
- The actual predicted letter comes from a completely separate path in `src/model/classifier.ts`: cosine similarity between the preprocessed drawing and a set of font-rendered letter templates (`src/model/templates.ts`), sharpened into a softmax via the `SHARPNESS` constant.

Both paths run from the same preprocessed input and are combined into one `PipelineArtifacts` object by `runForward()` in forward.ts, called from `runPipeline()` in pipeline.ts. Keep this split in mind — "improving the model" almost always means touching `classifier.ts`/`templates.ts`, not the conv/fc visualization code.

### Data flow

1. `src/components/DrawingCanvas.tsx` — user draws; ink is carried in the canvas alpha channel (fill color is cosmetic only, per `InkMode`).
2. `src/model/preprocess.ts`:`preprocessCanvas()` — MNIST-style prep: alpha bounding box → crop → progressive-halving resample to a 20px-long-side patch → paste into a 28×28 grid centered on ink's center of mass → 3×3 Gaussian blur → peak-normalize to 1. Returns `null` for an (almost) empty canvas.
3. `runPipeline()` → `runForward()` produces the full `PipelineArtifacts`.
4. `src/App.tsx` drives a `setTimeout` chain through `ANIMATION_PHASES`, using an incrementing `runIdRef` to invalidate stale timers if the user clears/redraws mid-animation. Phase timing lives in `PHASE_DURATION` in `src/types.ts`.
5. `src/components/NetworkScene.tsx` and `src/components/ResultPanel.tsx` render the artifacts per current `Phase`.

`src/model/templates.ts` builds its A–Z template set once (module-level cache) by rendering each letter in ~10 system font families through the *same* `preprocessCanvas()` used for user drawings, then L2-normalizing. `src/model/randomSample.ts` reuses those font variants to draw a wobbly "handwritten-looking" sample letter for the "random sample" button.

### Shared contract: src/types.ts

`src/types.ts` is the single source of truth for cross-module shapes: grid/layer-size constants, `PipelineArtifacts`, `Phase`/`StageStatus`/`STAGES` (drives both the animation timing and the stage descriptions shown in the UI), and every component's prop interface. Changing a shape here ripples across the whole app.

### Styling

Tailwind v4 is a devDependency (`@tailwindcss/vite`), but `vite.config.ts` does **not** register the Tailwind Vite plugin, and `src/index.css` is a pre-built/compiled Tailwind output checked into the repo (not a `@import "tailwindcss"` source file), followed by hand-written CSS for animations/effects at the bottom. New Tailwind utility classes used in components will **not** be generated automatically on build — either wire up `@tailwindcss/vite` first, or hand-add rules to `index.css`.
