'use client';

import { useEffect, useRef } from 'react';

export default function SpinningCube() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;
    const size = 40;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      angle += 0.02;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const project = (x: number, y: number, z: number) => {
        const scale = 200 / (200 + z);
        return {
          x: centerX + x * scale,
          y: centerY + y * scale
        };
      };

      const rotate = (x: number, y: number, z: number) => {
        let tempY = y * cos - z * sin;
        let tempZ = y * sin + z * cos;
        let tempX = x * cos - tempZ * sin;
        tempZ = x * sin + tempZ * cos;
        return { x: tempX, y: tempY, z: tempZ };
      };

      const vertices = [
        [-size, -size, -size], [size, -size, -size], [size, size, -size], [-size, size, -size],
        [-size, -size, size], [size, -size, size], [size, size, size], [-size, size, size]
      ];

      const rotatedVertices = vertices.map(([x, y, z]) => rotate(x, y, z));
      const projectedVertices = rotatedVertices.map(({ x, y, z }) => project(x, y, z));

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 8;

      edges.forEach(([start, end]) => {
        ctx.beginPath();
        ctx.moveTo(projectedVertices[start].x, projectedVertices[start].y);
        ctx.lineTo(projectedVertices[end].x, projectedVertices[end].y);
        ctx.stroke();
      });

      ctx.fillStyle = 'rgba(6, 182, 212, 0.1)';
      [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]].forEach(face => {
        ctx.beginPath();
        ctx.moveTo(projectedVertices[face[0]].x, projectedVertices[face[0]].y);
        face.forEach(i => ctx.lineTo(projectedVertices[i].x, projectedVertices[i].y));
        ctx.closePath();
        ctx.fill();
      });

      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  return <canvas ref={canvasRef} width={150} height={150} className="mx-auto" />;
}
