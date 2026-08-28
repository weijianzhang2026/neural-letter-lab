import { useRef } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { DrawingCanvasProps, InkMode } from '../types';

/** Internal bitmap resolution of the board (square). */
const CANVAS_SIZE = 640;
const STROKE_WIDTH = 34;

interface Point {
  x: number;
  y: number;
}

/**
 * Background décor for the board. Lives on a layer *behind* the canvas so the
 * canvas itself stays fully transparent — the model reads ink from the alpha
 * channel, and switching `ink` must never repaint or clear the drawing.
 */
function boardStyle(ink: InkMode): CSSProperties {
  const line = ink === 'light' ? 'rgba(56, 189, 248, 0.06)' : 'rgba(71, 85, 105, 0.14)';
  const grid =
    `repeating-linear-gradient(to right, ${line} 0px, ${line} 1px, transparent 1px, transparent 12.5%), ` +
    `repeating-linear-gradient(to bottom, ${line} 0px, ${line} 1px, transparent 1px, transparent 12.5%)`;
  return {
    backgroundColor: ink === 'light' ? '#0D1428' : '#F1F5F9',
    backgroundImage: grid,
    boxShadow:
      ink === 'light'
        ? 'inset 0 0 30px rgba(0, 0, 0, 0.5)'
        : 'inset 0 0 30px rgba(15, 23, 42, 0.12)',
  };
}

export default function DrawingCanvas({
  canvasRef,
  ink,
  disabled = false,
  onStrokeEnd,
}: DrawingCanvasProps) {
  // Imperative stroke state — never goes through React state (no re-renders
  // while the pointer moves).
  const activePointerRef = useRef<number | null>(null);
  const lastPointRef = useRef<Point>({ x: 0, y: 0 });
  const lastMidRef = useRef<Point>({ x: 0, y: 0 });

  const getCtx = (): CanvasRenderingContext2D | null =>
    canvasRef.current ? canvasRef.current.getContext('2d') : null;

  const toCanvasPoint = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE,
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || activePointerRef.current !== null || e.button !== 0) return;
    const ctx = getCtx();
    if (!ctx) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointerRef.current = e.pointerId;

    const p = toCanvasPoint(e);
    lastPointRef.current = p;
    lastMidRef.current = p;

    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ink === 'light' ? '#F8FAFC' : '#0B1020';

    // A tap with no movement should still leave a round dot.
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    const ctx = getCtx();
    if (!ctx) return;

    // Smooth the polyline: quadratic curves through midpoints of successive
    // points, using the raw points as control points.
    const p = toCanvasPoint(e);
    const last = lastPointRef.current;
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };

    ctx.beginPath();
    ctx.moveTo(lastMidRef.current.x, lastMidRef.current.y);
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.stroke();

    lastPointRef.current = p;
    lastMidRef.current = mid;
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onStrokeEnd?.();
  };

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="chip">Input · Drawing Board</span>
        <span className="text-[10px] text-muted">Draw one letter (A–Z)</span>
      </div>

      <div
        className={`relative aspect-square w-full overflow-hidden rounded-lg border border-primary/15 transition-opacity duration-300 ${
          disabled ? 'opacity-60' : ''
        }`}
      >
        {/* Décor layer: board colour + faint grid. The canvas above stays transparent. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 transition-colors duration-300"
          style={boardStyle(ink)}
        />
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          aria-label="Letter drawing board"
          className={`absolute inset-0 h-full w-full touch-none select-none ${
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
      </div>
    </section>
  );
}
