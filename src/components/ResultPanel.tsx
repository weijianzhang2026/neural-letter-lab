import { useEffect, useState } from 'react';
import type { Phase, PipelineArtifacts, ResultPanelProps } from '../types';
import { LETTERS } from '../types';

/** Phases during which the result must stay hidden and a live status is shown. */
const LIVE_TEXT: Partial<Record<Phase, string>> = {
  input: 'Reading pixels…',
  conv1: 'Scanning with filters…',
  conv2: 'Extracting deeper patterns…',
  encode: 'Compressing features…',
  fc: 'Matching letter patterns…',
};

function formatPct(prob: number): string {
  return (prob * 100).toFixed(1) + '%';
}

function Placeholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="flex h-28 w-28 items-center justify-center rounded-lg border-2 border-dashed border-muted/25">
        <span className="text-5xl font-bold text-muted/30">?</span>
      </div>
      <p className="max-w-[230px] text-sm leading-relaxed text-muted">
        Draw a letter on the left, then press Recognise.
      </p>
    </div>
  );
}

/** Pulsing status line + dim skeleton while the pipeline animation runs. */
function LiveAnalysis({ text }: { text: string }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        className="chip animate-pulse-soft flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2"
        style={{ color: 'var(--color-primary)' }}
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
        {text}
      </div>

      {/* Skeleton of the upcoming result card — no letter revealed yet. */}
      <div aria-hidden="true" className="flex flex-col gap-4 opacity-50">
        <div className="h-36 rounded-lg border border-primary/10 bg-ink/5" />
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-ink/10" />
          <div className="h-8 w-28 rounded bg-ink/10" />
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2.5 rounded-full bg-ink/5"
              style={{ width: `${82 - i * 18}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The revealed result. Mount-animated: fades and slides in, bars grow. */
function RevealedResult({ artifacts }: { artifacts: PipelineArtifacts }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const best = artifacts.top[0];
  if (!best) return null;

  const confidence = best.prob * 100;
  const confidenceClass =
    confidence >= 70 ? 'text-success' : confidence < 40 ? 'text-warn' : 'text-primary';

  return (
    <div
      className={`flex flex-col gap-4 transition-all duration-500 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      {/* Clean letter preview */}
      <div className="flex items-center justify-center rounded-lg border border-primary/25 bg-bg/60 py-6 ring-1 ring-primary/10">
        <span
          className="text-[96px] font-bold leading-none text-ink"
          style={{
            textShadow: '0 0 24px rgba(56, 189, 248, 0.5), 0 0 64px rgba(56, 189, 248, 0.22)',
          }}
        >
          {best.letter}
        </span>
      </div>

      {/* Confidence */}
      <div>
        <span className="chip">Confidence</span>
        <div className={`mt-0.5 text-3xl font-bold tabular-nums ${confidenceClass}`}>
          {formatPct(best.prob)}
        </div>
      </div>

      {/* Top predictions */}
      <div className="flex flex-col gap-2">
        <span className="chip">Top predictions</span>
        {artifacts.top.slice(0, 3).map((p, i) => (
          <div key={p.letter} className="flex items-center gap-2">
            <span className="chip w-7 shrink-0 rounded border border-primary/20 px-1 py-0.5 text-center">
              #{i + 1}
            </span>
            <span className="w-4 shrink-0 text-sm font-semibold text-ink">{p.letter}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out"
                style={{ width: shown ? `${Math.max(p.prob * 100, 1.5)}%` : '0%' }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono-ui text-[11px] text-muted">
              {formatPct(p.prob)}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-primary/10" aria-hidden="true" />

      {/* All 26 letters */}
      <div>
        <span className="chip">All 26 letters</span>
        <div className="mt-2 flex h-12 items-end gap-px">
          {LETTERS.map((letter, i) => {
            const prob = artifacts.probs[i] ?? 0;
            const height = Math.max(2, Math.round(prob * 48));
            const winner = letter === best.letter;
            return (
              <div
                key={letter}
                title={`${letter} — ${formatPct(prob)}`}
                className={`flex-1 rounded-t-[2px] transition-all duration-700 ease-out ${
                  winner ? 'bg-success' : 'bg-primary/40'
                }`}
                style={{ height: shown ? `${height}px` : '2px' }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex gap-px">
          {LETTERS.map((letter) => (
            <span
              key={letter}
              className={`flex-1 text-center font-mono-ui text-[8px] leading-none ${
                letter === best.letter ? 'text-success' : 'text-muted/70'
              }`}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      {/* Explanation */}
      <div className="space-y-1 pt-1">
        <p className="text-xs leading-relaxed text-muted">
          The network matched your strokes most closely to '{best.letter}'.
        </p>
        <p className="text-[11px] text-muted/70">
          Demo classifier: template similarity over real convolution features.
        </p>
      </div>
    </div>
  );
}

export default function ResultPanel({ artifacts, phase, notice }: ResultPanelProps) {
  const liveText = artifacts !== null ? LIVE_TEXT[phase] : undefined;

  return (
    <section className="panel flex h-full flex-col gap-3 overflow-y-auto p-4">
      <span className="chip shrink-0">Output · Prediction</span>

      {notice !== null && (
        <div className="flex shrink-0 items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          <span aria-hidden="true">⚠</span>
          <span>{notice}</span>
        </div>
      )}

      {artifacts === null ? (
        <Placeholder />
      ) : liveText !== undefined ? (
        <LiveAnalysis text={liveText} />
      ) : (
        // phase is 'output' / 'done' (or stale 'idle' with a kept result)
        <RevealedResult artifacts={artifacts} />
      )}
    </section>
  );
}
