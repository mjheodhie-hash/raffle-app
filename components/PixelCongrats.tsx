"use client";

import { useEffect, useRef } from "react";

type Cell = { x: number; y: number; glow: number };

export default function PixelCongrats({
  text = "CONGRATULATIONS",
  color = "#22c55e",
}: {
  text?: string;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Cell[]>([]);
  const roRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const cellSizeRef = useRef<number>(12);
  const gapRef = useRef<number>(2);

  // Build a 3-row contributions-style grid that spans the available width
  const buildGrid = (w: number, h: number) => {
    const rows = 3;
    const margin = 4;
    const gap = 2;
    const cell = Math.max(6, Math.floor((h - 2 * margin - (rows - 1) * gap) / rows));
    const cols = Math.max(8, Math.floor((w - 2 * margin + gap) / (cell + gap)));

    const cells: Cell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = margin + c * (cell + gap);
        const y = margin + r * (cell + gap);
        cells.push({ x, y, glow: Math.random() * 0.2 });
      }
    }

    cellsRef.current = cells;
    cellSizeRef.current = cell;
    gapRef.current = gap;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const onResize = () => {
      const parent = canvas.parentElement as HTMLElement | null;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = 48; // compact height for exactly three rows
      canvas.width = w;
      canvas.height = h;
      buildGrid(w, h);
    };

    onResize();
    const ro = new ResizeObserver(onResize);
    roRef.current = ro;
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = () => {
      const now = performance.now();
      const targetMs = 1000 / 24;
      if (lastFrameRef.current && now - lastFrameRef.current < targetMs) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = now;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const cells = cellsRef.current;
      const size = cellSizeRef.current;

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (Math.random() < 0.02) c.glow = 1;
        c.glow *= 0.9;

        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.25 + 0.6 * Math.min(1, c.glow);
        ctx.shadowColor = color;
        ctx.shadowBlur = 6 + 10 * Math.min(1, c.glow);
        ctx.fillRect(c.x, c.y, size, size);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x + 0.5, c.y + 0.5, size - 1, size - 1);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (roRef.current) roRef.current.disconnect();
    };
  }, [text, color]);

  return (
    <canvas ref={canvasRef} className="w-full block" />
  );
}
