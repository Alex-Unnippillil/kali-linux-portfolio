import React, { useEffect, useRef } from 'react';
import { DEFAULT_ENGINE_CONFIG, GameState, PIECE_COLORS, ROTATIONS, getGhostY } from '../engine';

const CELL = 26;

const shade = (hex: string, amount: number) => {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (n & 0xff) + amount));
  return `rgb(${r}, ${g}, ${b})`;
};

interface Props {
  state: GameState;
  focused: boolean;
  ghostEnabled: boolean;
  gridlines: boolean;
}

const TetrisCanvas: React.FC<Props> = ({ state, focused, ghostEnabled, gridlines }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const width = DEFAULT_ENGINE_CONFIG.width * CELL;
  const height = DEFAULT_ENGINE_CONFIG.visibleHeight * CELL;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    const startRow = DEFAULT_ENGINE_CONFIG.hiddenRows;
    for (let y = 0; y < DEFAULT_ENGINE_CONFIG.visibleHeight; y += 1) {
      for (let x = 0; x < DEFAULT_ENGINE_CONFIG.width; x += 1) {
        const value = state.board[startRow + y][x];
        if (!value) continue;
        const color = PIECE_COLORS[value];
        ctx.fillStyle = color;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        ctx.strokeStyle = shade(color, 40);
        ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      }
    }

    if (state.active) {
      if (ghostEnabled) {
        const ghostY = getGhostY(state.board, state.active, DEFAULT_ENGINE_CONFIG);
        ctx.globalAlpha = 0.25;
        ROTATIONS[state.active.type][state.active.rotation].forEach((cell) => {
          const y = ghostY + cell.y - startRow;
          if (y < 0) return;
          const x = state.active!.x + cell.x;
          ctx.fillStyle = PIECE_COLORS[state.active!.type];
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        });
        ctx.globalAlpha = 1;
      }

      ROTATIONS[state.active.type][state.active.rotation].forEach((cell) => {
        const y = state.active!.y + cell.y - startRow;
        const x = state.active!.x + cell.x;
        if (y < 0) return;
        const color = PIECE_COLORS[state.active!.type];
        ctx.fillStyle = color;
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        ctx.strokeStyle = shade(color, 50);
        ctx.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
      });
    }

    if (gridlines) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= DEFAULT_ENGINE_CONFIG.width; x += 1) {
        ctx.beginPath();
        ctx.moveTo(x * CELL + 0.5, 0);
        ctx.lineTo(x * CELL + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y <= DEFAULT_ENGINE_CONFIG.visibleHeight; y += 1) {
        ctx.beginPath();
        ctx.moveTo(0, y * CELL + 0.5);
        ctx.lineTo(width, y * CELL + 0.5);
        ctx.stroke();
      }
    }

    if (!focused) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, width, height);
    }
  }, [focused, ghostEnabled, gridlines, height, state, width]);

  return <canvas ref={ref} className="rounded-md border border-slate-700 bg-slate-950 shadow-inner" aria-label="Tetris board" />;
};

export default React.memo(TetrisCanvas);
