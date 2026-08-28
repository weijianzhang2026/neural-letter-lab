import {
  FC1_SIZE,
  FC2_SIZE,
  LETTERS,
  STAGES,
  phaseRank,
  stageStatus,
} from '../types';
import type {
  FeatureMap,
  NetworkSceneProps,
  Phase,
  PipelineArtifacts,
  StageInfo,
  StageStatus,
} from '../types';
import PixelGridPreview from './PixelGridPreview';

function statusClass(status: StageStatus): string {
  return status === 'active' ? 'stage-active' : status === 'done' ? 'stage-done' : 'stage-pending';
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'input':
      return 'Pixel preprocessing';
    case 'conv1':
      return 'Convolution layer 1';
    case 'conv2':
      return 'Convolution layer 2';
    case 'encode':
      return 'Encoding features';
    case 'fc':
      return 'Fully connected matching';
    case 'output':
      return 'Softmax output';
    case 'done':
      return 'Result ready';
    default:
      return 'Waiting for input';
  }
}

function placeholderValue(i: number): number {
  const x = i % 14;
  const y = Math.floor(i / 14);
  return (x * 5 + y * 3) % 19 === 0 ? 0.26 : (x + y) % 7 === 0 ? 0.1 : 0.02;
}

function MiniFeatureMap({
  map,
  label,
  active,
}: {
  map: FeatureMap | null;
  label: string;
  active: boolean;
}) {
  const size = map?.size ?? 14;
  const values = Array.from({ length: size * size }, (_, i) => map?.data[i] ?? placeholderValue(i));

  return (
    <div className="min-w-0">
      <div
        className={`relative grid aspect-square w-full gap-px overflow-hidden rounded-md border p-1 ${
          active ? 'border-primary/45 bg-primary/10' : 'border-primary/15 bg-bg/60'
        }`}
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {values.map((v, i) => {
          const alpha = Math.min(0.9, Math.max(0.02, v));
          return (
            <span
              key={i}
              className="rounded-[1px]"
              style={{
                background: `rgba(56, 189, 248, ${alpha})`,
                boxShadow: active && alpha > 0.45 ? `0 0 5px rgba(56, 189, 248, ${alpha})` : undefined,
              }}
            />
          );
        })}
        {active && <span aria-hidden="true" className="kernel-scan" />}
      </div>
      <div className="mt-1 truncate font-mono-ui text-[9px] text-muted">{label}</div>
    </div>
  );
}

function FeatureMapCluster({
  maps,
  status,
  fallbackPrefix,
}: {
  maps: FeatureMap[] | undefined;
  status: StageStatus;
  fallbackPrefix: string;
}) {
  const active = status === 'active';
  const visibleMaps = [0, 1, 2].map((i) => maps?.[i] ?? null);

  return (
    <div className="grid grid-cols-3 gap-2">
      {visibleMaps.map((map, i) => (
        <MiniFeatureMap
          key={`${fallbackPrefix}-${i}`}
          map={map}
          label={map?.kernelName ?? `${fallbackPrefix} ${i + 1}`}
          active={active}
        />
      ))}
    </div>
  );
}

function EncoderBars({ artifacts, status }: { artifacts: PipelineArtifacts | null; status: StageStatus }) {
  const values = artifacts?.latent ?? Array.from({ length: 24 }, (_, i) => 0.12 + ((i * 7) % 10) / 36);
  const active = status === 'active';

  return (
    <div className="flex h-24 items-end gap-1 rounded-md border border-primary/15 bg-bg/60 px-2 py-2">
      {values.map((v, i) => (
        <span
          key={i}
          title={`latent ${i + 1}: ${v.toFixed(2)}`}
          className={`flex-1 rounded-t-[2px] transition-all duration-500 ${
            active ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.35)]' : 'bg-success/55'
          }`}
          style={{ height: `${Math.max(8, Math.round(v * 88))}%` }}
        />
      ))}
    </div>
  );
}

function nodeValues(values: number[] | undefined, size: number, offset: number): number[] {
  return Array.from({ length: size }, (_, i) => values?.[i] ?? 0.22 + ((i * 5 + offset) % 12) / 30);
}

function FullyConnectedViz({
  artifacts,
  status,
}: {
  artifacts: PipelineArtifacts | null;
  status: StageStatus;
}) {
  const active = status === 'active';
  const left = nodeValues(artifacts?.latent.slice(0, 10), 10, 1);
  const mid = nodeValues(artifacts?.fc1, Math.min(FC1_SIZE, 9), 4);
  const right = nodeValues(artifacts?.fc2, Math.min(FC2_SIZE, 7), 8);
  const columns = [left, mid, right];
  const xs = [20, 115, 210];
  const height = 124;

  const yFor = (index: number, count: number) => 14 + (index * (height - 28)) / Math.max(1, count - 1);

  return (
    <svg
      viewBox="0 0 230 124"
      role="img"
      aria-label="Fully connected neural network layers"
      className="h-28 w-full rounded-md border border-primary/15 bg-bg/60"
    >
      {columns.slice(0, -1).flatMap((col, ci) =>
        col.flatMap((v, i) =>
          columns[ci + 1].map((nv, ni) => {
            const strength = (v + nv) / 2;
            return (
              <line
                key={`${ci}-${i}-${ni}`}
                x1={xs[ci]}
                y1={yFor(i, col.length)}
                x2={xs[ci + 1]}
                y2={yFor(ni, columns[ci + 1].length)}
                stroke={active ? '#38BDF8' : '#64748B'}
                strokeWidth={active ? 0.45 + strength * 0.8 : 0.35}
                opacity={active ? 0.12 + strength * 0.42 : 0.12}
              />
            );
          }),
        ),
      )}

      {columns.map((col, ci) =>
        col.map((v, i) => (
          <circle
            key={`node-${ci}-${i}`}
            cx={xs[ci]}
            cy={yFor(i, col.length)}
            r={active ? 3.2 + v * 2.1 : 3.4}
            fill={ci === 2 ? '#8B5CF6' : '#38BDF8'}
            opacity={active ? 0.45 + v * 0.55 : 0.42}
          />
        )),
      )}
    </svg>
  );
}

function OutputNodes({ artifacts, status }: { artifacts: PipelineArtifacts | null; status: StageStatus }) {
  const probs = artifacts?.probs ?? LETTERS.map((_, i) => 0.01 + ((i * 3) % 9) / 260);
  const best = artifacts?.top[0]?.letter;
  const active = status === 'active' || status === 'done';

  return (
    <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 rounded-md border border-primary/15 bg-bg/60 p-2">
      {LETTERS.map((letter, i) => {
        const prob = probs[i] ?? 0;
        const winner = letter === best;
        return (
          <span
            key={letter}
            title={`${letter}: ${(prob * 100).toFixed(1)}%`}
            className={`flex aspect-square items-center justify-center rounded text-[10px] font-bold transition-all duration-500 ${
              winner
                ? 'bg-success text-bg shadow-[0_0_14px_rgba(34,197,94,0.45)]'
                : active
                  ? 'bg-primary/15 text-ink'
                  : 'bg-ink/5 text-muted'
            }`}
            style={{
              opacity: active ? Math.max(0.32, Math.min(1, prob * 9 + 0.35)) : undefined,
            }}
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}

function StageVisual({
  stage,
  status,
  artifacts,
}: {
  stage: StageInfo;
  status: StageStatus;
  artifacts: PipelineArtifacts | null;
}) {
  switch (stage.id) {
    case 'pixels':
      return <PixelGridPreview matrix={artifacts?.input ?? null} status={status} />;
    case 'conv1':
      return <FeatureMapCluster maps={artifacts?.conv1} status={status} fallbackPrefix="Edge" />;
    case 'conv2':
      return <FeatureMapCluster maps={artifacts?.conv2} status={status} fallbackPrefix="Shape" />;
    case 'encoder':
      return <EncoderBars artifacts={artifacts} status={status} />;
    case 'fc':
      return <FullyConnectedViz artifacts={artifacts} status={status} />;
    case 'output':
      return <OutputNodes artifacts={artifacts} status={status} />;
    default:
      return null;
  }
}

function PipelineConnector({
  active,
  done,
  particles,
}: {
  active: boolean;
  done: boolean;
  particles: boolean;
}) {
  return (
    <div className="pipeline-connector" aria-hidden="true">
      <span className={`pipeline-line ${done ? 'pipeline-line-done' : ''} ${active ? 'pipeline-line-active' : ''}`} />
      {active &&
        particles &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            className="pipeline-particle"
            style={{ animationDelay: `${i * 0.32}s` }}
          />
        ))}
    </div>
  );
}

function StageCard({
  stage,
  status,
  artifacts,
  particles,
}: {
  stage: StageInfo;
  status: StageStatus;
  artifacts: PipelineArtifacts | null;
  particles: boolean;
}) {
  const active = status === 'active';
  const done = status === 'done';

  return (
    <article className={`stage ${statusClass(status)} flex min-w-0 flex-col gap-2 rounded-lg border bg-panel/85 p-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-mono-ui text-[10px] text-primary/80">0{stage.index}</div>
          <h2 className="text-sm font-semibold text-ink">{stage.title}</h2>
        </div>
        <span
          className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
            status === 'active' ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-muted/35'
          }`}
        />
      </div>
      <div className={`stage-flow-rail ${done ? 'stage-flow-done' : ''} ${active ? 'stage-flow-active' : ''}`}>
        {active &&
          particles &&
          [0, 1].map((i) => (
            <span key={i} className="stage-flow-dot" style={{ animationDelay: `${i * 0.45}s` }} />
          ))}
      </div>
      <StageVisual stage={stage} status={status} artifacts={artifacts} />
      <p className="text-xs leading-relaxed text-muted">{stage.blurb}</p>
    </article>
  );
}

export default function NetworkScene({ artifacts, phase, particles }: NetworkSceneProps) {
  const currentStageIndex = STAGES.findIndex((stage) => stage.phase === phase);

  return (
    <section className="panel flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="chip">Neural Pipeline</span>
          <h1 className="mt-1 text-xl font-semibold text-ink">Letter recognition flow</h1>
        </div>
        <div className="rounded-lg border border-primary/20 bg-bg/60 px-3 py-2 text-right">
          <div className="font-mono-ui text-[10px] text-muted">Current phase</div>
          <div className="text-sm font-semibold text-primary">{phaseLabel(phase)}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="pipeline-board h-full">
          {STAGES.map((stage) => {
            const status = stageStatus(stage.phase, phase);
            const activeIndex = currentStageIndex === STAGES.indexOf(stage);

            return (
              <StageCard
                key={stage.id}
                stage={stage}
                status={status}
                artifacts={artifacts}
                particles={particles && activeIndex}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
