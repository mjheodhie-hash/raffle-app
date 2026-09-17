'use client';

import { useEffect, useState } from 'react';

interface Block {
  id: number;
  data: string;
  y: number;
}

export default function BlockchainAnimation({ isAnimating }: { isAnimating: boolean }) {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    if (!isAnimating) {
      setBlocks([]);
      return;
    }

    const interval = setInterval(() => {
      setBlocks(prev => {
        const newBlocks = prev
          .map(block => ({ ...block, y: block.y + 5 }))
          .filter(block => block.y < 100);

        if (Math.random() > 0.7) {
          newBlocks.push({
            id: Date.now(),
            data: Math.random().toString(36).substring(7).toUpperCase(),
            y: -10
          });
        }

        return newBlocks.slice(-8);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {blocks.map(block => (
        <div
          key={block.id}
          className="absolute left-1/2 transform -translate-x-1/2"
          style={{
            top: `${block.y}%`,
            transition: 'top 0.05s linear'
          }}
        >
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-cyan-300 opacity-50">
            <div className="text-xs font-mono">{block.data}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
