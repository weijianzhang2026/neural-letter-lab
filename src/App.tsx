import { useCallback, useEffect, useRef, useState } from 'react';
import ControlPanel from './components/ControlPanel';
import DrawingCanvas from './components/DrawingCanvas';
import NetworkScene from './components/NetworkScene';
import ResultPanel from './components/ResultPanel';
import { drawRandomLetter } from './model/randomSample';
import { runPipeline, warmUp } from './model/pipeline';
import { PHASE_DURATION } from './types';
import type { InkMode, Phase, PipelineArtifacts } from './types';

const ANIMATION_PHASES: Phase[] = ['input', 'conv1', 'conv2', 'encode', 'fc', 'output'];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const runIdRef = useRef(0);

  const [ink, setInk] = useState<InkMode>('light');
  const [particles, setParticles] = useState(true);
  const [artifacts, setArtifacts] = useState<PipelineArtifacts | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  const playAnimation = useCallback(
    (nextArtifacts: PipelineArtifacts) => {
      clearTimers();
      const runId = ++runIdRef.current;

      setArtifacts(nextArtifacts);
      setNotice(null);
      setRunning(true);

      let elapsed = 0;
      for (const nextPhase of ANIMATION_PHASES) {
        const id = window.setTimeout(() => {
          if (runIdRef.current === runId) setPhase(nextPhase);
        }, elapsed);
        timersRef.current.push(id);
        elapsed += PHASE_DURATION[nextPhase];
      }

      const doneId = window.setTimeout(() => {
        if (runIdRef.current !== runId) return;
        setPhase('done');
        setRunning(false);
      }, elapsed);
      timersRef.current.push(doneId);
    },
    [clearTimers],
  );

  const clearCanvas = useCallback(() => {
    clearTimers();
    runIdRef.current++;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

    setArtifacts(null);
    setNotice(null);
    setPhase('idle');
    setRunning(false);
  }, [clearTimers]);

  const recognise = useCallback(() => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const nextArtifacts = runPipeline(canvas);
    if (!nextArtifacts) {
      clearTimers();
      runIdRef.current++;
      setArtifacts(null);
      setPhase('idle');
      setRunning(false);
      setNotice('Draw a letter first, or load a random sample.');
      return;
    }

    playAnimation(nextArtifacts);
  }, [clearTimers, playAnimation, running]);

  const replay = useCallback(() => {
    if (running || !artifacts) return;
    playAnimation(artifacts);
  }, [artifacts, playAnimation, running]);

  const randomSample = useCallback(() => {
    if (running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    clearTimers();
    runIdRef.current++;
    drawRandomLetter(canvas, ink);
    setArtifacts(null);
    setNotice(null);
    setPhase('idle');
  }, [clearTimers, ink, running]);

  const handleStrokeEnd = useCallback(() => {
    if (running) return;
    setArtifacts(null);
    setNotice(null);
    setPhase('idle');
  }, [running]);

  useEffect(() => {
    warmUp();
    return clearTimers;
  }, [clearTimers]);

  return (
    <div className="app-shell">
      <main className="grid min-h-full gap-4 p-4 lg:h-full lg:grid-cols-[300px_minmax(0,1fr)_300px] xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <aside className="flex min-h-0 flex-col gap-4 lg:h-full">
          <DrawingCanvas
            canvasRef={canvasRef}
            ink={ink}
            disabled={running}
            onStrokeEnd={handleStrokeEnd}
          />
          <ControlPanel
            running={running}
            hasResult={artifacts !== null}
            ink={ink}
            particles={particles}
            onClear={clearCanvas}
            onRecognise={recognise}
            onRandom={randomSample}
            onReplay={replay}
            onInkChange={setInk}
            onParticlesChange={setParticles}
          />
        </aside>

        <div className="min-h-[620px] min-w-0 lg:h-full lg:min-h-0">
          <NetworkScene artifacts={artifacts} phase={phase} particles={particles} />
        </div>

        <aside className="min-h-[560px] lg:h-full lg:min-h-0">
          <ResultPanel artifacts={artifacts} phase={phase} notice={notice} />
        </aside>
      </main>
    </div>
  );
}
