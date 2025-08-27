import React, { useEffect, useRef } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import {
  createGame,
  update,
  nudge,
  flippersEnabled,
  WIDTH,
  HEIGHT,
  FLOOR,
} from './pinballPhysics';

const Pinball = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const gameRef = useRef(createGame());

  const setFlipper = (side, value) => {
    gameRef.current.flippers[side] = value;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const game = gameRef.current;

    const keydown = (e) => {
      if (e.key === 'ArrowLeft') setFlipper('left', true);
      if (e.key === 'ArrowRight') setFlipper('right', true);
    };

    const keyup = (e) => {
      if (e.key === 'ArrowLeft') setFlipper('left', false);
      if (e.key === 'ArrowRight') setFlipper('right', false);
    };

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    let startX = 0;
    const touchStart = (e) => {
      startX = e.touches[0].clientX;
    };
    const touchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      nudge(game, dx * 2);
    };
    canvas.addEventListener('touchstart', touchStart);
    canvas.addEventListener('touchend', touchEnd);

    let last = 0;
    let animationId;

    const loop = (time) => {
      animationId = requestAnimationFrame(loop);
      const dt = (time - last) / 1000;
      last = time;

      update(game, dt);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      game.bumpers.forEach((b) => {
        ctx.fillStyle = b.litTime > 0 ? '#ff0' : '#555';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#ff6f00';
      ctx.save();
      ctx.translate(80, FLOOR);
      ctx.rotate(game.flippers.left && flippersEnabled(game) ? -0.5 : 0);
      ctx.fillRect(-40, -5, 40, 10);
      ctx.restore();

      ctx.save();
      ctx.translate(WIDTH - 80, FLOOR);
      ctx.rotate(game.flippers.right && flippersEnabled(game) ? 0.5 : 0);
      ctx.fillRect(0, -5, 40, 10);
      ctx.restore();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(game.ball.x, game.ball.y, game.ball.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${game.score}`, 10, 20);

      if (!flippersEnabled(game)) {
        ctx.fillStyle = '#f00';
        ctx.fillText('TILT', WIDTH / 2 - 20, 20);
      }
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      canvas.removeEventListener('touchstart', touchStart);
      canvas.removeEventListener('touchend', touchEnd);
    };
  }, [canvasRef]);

  return (
    <div className="h-full w-full flex items-center justify-center bg-ub-cool-grey relative">
      <canvas ref={canvasRef} className="bg-black w-full h-full" />
      <div className="absolute inset-x-0 bottom-0 flex">
        <button
          className="flex-1 h-16 opacity-20 bg-white"
          onMouseDown={() => setFlipper('left', true)}
          onMouseUp={() => setFlipper('left', false)}
          onTouchStart={() => setFlipper('left', true)}
          onTouchEnd={() => setFlipper('left', false)}
        />
        <button
          className="flex-1 h-16 opacity-20 bg-white"
          onMouseDown={() => setFlipper('right', true)}
          onMouseUp={() => setFlipper('right', false)}
          onTouchStart={() => setFlipper('right', true)}
          onTouchEnd={() => setFlipper('right', false)}
        />
      </div>
    </div>
  );
};

export default Pinball;

