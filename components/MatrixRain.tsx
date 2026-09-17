"use client";

import { useEffect, useRef } from "react";

export default function MatrixRain({ active = false }: { active?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cleanupRef = useRef<() => void>(() => {});
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let fontSize = 14;
    let columns = 0;
    let drops: number[] = [];
    const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    const resize = () => {
      const parent = canvas.parentElement as HTMLElement | null;
      if (!parent) return;
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
      fontSize = Math.max(14, Math.min(20, Math.floor(width / 55)));
      columns = Math.max(16, Math.floor(width / (fontSize * 1.0)));
      drops = new Array(columns).fill(0).map(() => Math.floor(Math.random() * (height / fontSize)));
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const draw = () => {
      const now = performance.now();
      const targetMs = 1000 / 30; // ~30 FPS cap to reduce load
      if (lastFrameRef.current && now - lastFrameRef.current < targetMs) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrameRef.current = now;

      // Keep background effectively black while allowing slight trails
      ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
      ctx.fillRect(0, 0, width, height);
      ctx.font = `700 ${fontSize}px monospace`;

      const tailLength = 8;

      for (let i = 0; i < columns; i++) {
        const x = i * fontSize;
        const headY = drops[i] * fontSize;

        // Draw head + tail for more density
        for (let j = 0; j < tailLength; j++) {
          const y = (drops[i] - j) * fontSize;
          if (y < 0 || y > height) continue;
          const text = chars.charAt(Math.floor(Math.random() * chars.length));

          if (j === 0) {
            // Head with strong glow (single draw)
            ctx.save();
            ctx.fillStyle = "#22c55e";
            ctx.globalAlpha = 0.95;
            ctx.shadowColor = "#22c55e";
            ctx.shadowBlur = 8;
            ctx.fillText(text, x, y);
            ctx.restore();
          } else {
            // Tail characters with lighter glow and lower alpha
            const alpha = Math.max(0, 1 - j / (tailLength + 1));
            ctx.save();
            ctx.fillStyle = "#22c55e";
            ctx.globalAlpha = 0.4 * alpha;
            ctx.shadowColor = "#22c55e";
            ctx.shadowBlur = 2 * alpha;
            ctx.fillText(text, x, y);
            ctx.restore();
          }
        }

        // Advance drop
        if (headY > height && Math.random() > 0.975) drops[i] = 0; else drops[i]++;
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    };

    if (active) rafRef.current = requestAnimationFrame(draw);

    cleanupRef.current = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };

    return () => cleanupRef.current();
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
