import type { ControlPanelProps } from '../types';

function SecondaryButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all duration-200 ${
        disabled
          ? 'cursor-not-allowed border-primary/10 text-muted/40'
          : 'border-primary/25 text-ink hover:border-primary/60 hover:text-primary hover:shadow-[0_0_14px_rgba(56,189,248,0.2)]'
      }`}
    >
      {label}
    </button>
  );
}

function SegmentButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition-all duration-200 ${
        active
          ? 'border-primary/40 bg-primary/15 text-primary shadow-[0_0_10px_rgba(56,189,248,0.15)]'
          : 'border-transparent text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200 ${
        checked
          ? 'border-primary/60 bg-primary shadow-[0_0_10px_rgba(56,189,248,0.45)]'
          : 'border-muted/30 bg-muted/20'
      }`}
    >
      <span
        className={`absolute left-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform duration-200 ${
          checked ? 'translate-x-[18px] bg-bg' : 'translate-x-0 bg-ink/80'
        }`}
      />
    </button>
  );
}

export default function ControlPanel({
  running,
  hasResult,
  ink,
  particles,
  onClear,
  onRecognise,
  onRandom,
  onReplay,
  onInkChange,
  onParticlesChange,
}: ControlPanelProps) {
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <span className="chip">Console · Controls</span>

      {/* Primary action */}
      <button
        type="button"
        onClick={onRecognise}
        disabled={running}
        className={`w-full rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ${
          running
            ? 'cursor-not-allowed opacity-60 saturate-50'
            : 'glow-primary hover:brightness-110 active:scale-[0.99]'
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {running ? (
            <>
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
              Recognising…
            </>
          ) : (
            <>
              <span aria-hidden="true" className="text-[10px] leading-none">
                ▶
              </span>
              Recognise
            </>
          )}
        </span>
      </button>

      {/* Secondary actions */}
      <div className="grid grid-cols-3 gap-2">
        <SecondaryButton label="Clear" onClick={onClear} />
        <SecondaryButton label="Random" onClick={onRandom} disabled={running} />
        <SecondaryButton label="Replay" onClick={onReplay} disabled={!hasResult || running} />
      </div>

      <div className="h-px bg-primary/10" aria-hidden="true" />

      {/* Brush mode */}
      <div className="flex flex-col gap-1.5">
        <span className="chip">Brush mode</span>
        <div
          role="group"
          aria-label="Brush mode"
          className="grid grid-cols-2 gap-1 rounded-lg border border-primary/20 bg-bg/50 p-1"
        >
          <SegmentButton
            active={ink === 'light'}
            label="White on dark"
            onClick={() => onInkChange('light')}
          />
          <SegmentButton
            active={ink === 'dark'}
            label="Black on light"
            onClick={() => onInkChange('dark')}
          />
        </div>
      </div>

      {/* Particle flow */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-ink">Particle flow</span>
          <span className="text-[10px] text-muted">Animated signals between layers</span>
        </div>
        <Switch checked={particles} onChange={onParticlesChange} label="Particle flow" />
      </div>
    </section>
  );
}
