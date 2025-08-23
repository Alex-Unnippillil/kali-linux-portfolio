import React, { useEffect, useRef, useState } from 'react';
import Player from './Player';
import Ghost from './Ghost';
import Maze from './Maze';
import Editor from './editor';

const Pacman: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maze, setMaze] = useState<Maze | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [score, setScore] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const animRef = useRef<number>(0);

  useEffect(() => {
    Maze.load('default').then((m) => {
      setMaze(m);
      setPlayer(
        new Player(
          m.playerStart.x * m.tileSize + m.tileSize / 2,
          m.playerStart.y * m.tileSize + m.tileSize / 2,
        ),
      );
      setGhosts(
        m.ghosts.map(
          (g) =>
            new Ghost({
              ...g,
              x: g.x * m.tileSize + m.tileSize / 2,
              y: g.y * m.tileSize + m.tileSize / 2,
            }),
        ),
      );
    });
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !maze || !player) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const loop = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      maze.draw(ctx);
      player.update(maze);
      const eaten = maze.eat(player.x, player.y);
      if (eaten === 'pellet') setScore((s) => s + 10);
      else if (eaten === 'power') {
        player.powered = 60 * 10;
        setScore((s) => s + 50);
      } else if (eaten && typeof eaten === 'object') {
        setScore((s) => s + eaten.score);
      }
      ghosts.forEach((g) => {
        g.update(player, maze);
        const dx = g.x - player.x;
        const dy = g.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          if (player.powered > 0) {
            g.reset();
            setScore((s) => s + 200);
          } else {
            cancelAnimationFrame(animRef.current!);
            fetch('/api/pacman/score', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ score }),
            });
          }
        }
        g.draw(ctx, player.powered > 0);
      });
      player.draw(ctx);
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current!);
  }, [maze, player, ghosts, score]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!player) return;
      switch (e.key) {
        case 'ArrowUp':
          player.setDirection(0, -1);
          break;
        case 'ArrowDown':
          player.setDirection(0, 1);
          break;
        case 'ArrowLeft':
          player.setDirection(-1, 0);
          break;
        case 'ArrowRight':
          player.setDirection(1, 0);
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [player]);

  useEffect(() => {
    let sx = 0;
    let sy = 0;
    const start = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const end = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (!player) return;
      if (Math.abs(dx) > Math.abs(dy)) player.setDirection(Math.sign(dx), 0);
      else player.setDirection(0, Math.sign(dy));
    };
    const el = canvasRef.current;
    el?.addEventListener('touchstart', start);
    el?.addEventListener('touchend', end);
    return () => {
      el?.removeEventListener('touchstart', start);
      el?.removeEventListener('touchend', end);
    };
  }, [player]);

  return (
    <div className="p-4 space-y-2 select-none">
      <canvas
        ref={canvasRef}
        width={maze?.width ? maze.width * maze.tileSize : 0}
        height={maze?.height ? maze.height * maze.tileSize : 0}
        className="border"
      />
      <div className="flex space-x-2 items-center">
        <div>Score: {score}</div>
        <button
          type="button"
          onClick={() => setShowEditor((s) => !s)}
          className="px-2 py-1 bg-gray-300 rounded"
        >
          {showEditor ? 'Hide' : 'Edit'}
        </button>
      </div>
      {showEditor && <Editor />}
    </div>
  );
};

export default Pacman;
