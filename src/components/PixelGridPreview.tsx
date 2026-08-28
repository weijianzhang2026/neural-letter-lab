import { GRID } from '../types';
import type { PixelGridPreviewProps } from '../types';

function emptyCellValue(i: number): number {
  const x = i % GRID;
  const y = Math.floor(i / GRID);
  return (x + y * 2) % 11 === 0 ? 0.16 : (x * 3 + y) % 17 === 0 ? 0.08 : 0;
}

export default function PixelGridPreview({ matrix, status }: PixelGridPreviewProps) {
  const cells = Array.from({ length: GRID * GRID }, (_, i) => matrix?.[i] ?? emptyCellValue(i));

  return (
    <div
      className={`grid aspect-square w-full grid-cols-[repeat(28,minmax(0,1fr))] gap-px rounded-md border p-1 transition-all duration-500 ${
        status === 'active'
          ? 'border-primary/45 bg-primary/10 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
          : 'border-primary/15 bg-bg/60'
      }`}
      aria-label="28 by 28 pixel input grid"
    >
      {cells.map((v, i) => {
        const alpha = Math.min(0.95, Math.max(0, v));
        return (
          <span
            key={i}
            className="rounded-[1px]"
            style={{
              background:
                matrix === null
                  ? `rgba(148, 163, 184, ${alpha})`
                  : `rgba(248, 250, 252, ${alpha})`,
              boxShadow:
                status === 'active' && alpha > 0.35
                  ? `0 0 6px rgba(56, 189, 248, ${alpha * 0.55})`
                  : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
