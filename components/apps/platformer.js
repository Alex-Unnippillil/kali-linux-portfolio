import React, { useRef, useEffect } from 'react';

// Simple level definition with platforms and coins
const level = {
  width: 640,
  height: 360,
  platforms: [
    { x: 0, y: 340, width: 640, height: 20 }, // ground
    { x: 80, y: 260, width: 100, height: 10 },
    { x: 220, y: 220, width: 120, height: 10 },
    { x: 420, y: 180, width: 100, height: 10 },
  ],
  coins: [
    { x: 110, y: 230, collected: false },
    { x: 260, y: 190, collected: false },
    { x: 450, y: 150, collected: false },
  ],
};

const Platformer = () => {
  const canvasRef = useRef(null);
  const playerRef = useRef({
    x: 32,
    y: 0,
    width: 20,
    height: 20,
    vx: 0,
    vy: 0,
    onGround: false,
    score: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animation;
    const keys = {};

    const keyDown = (e) => {
      keys[e.code] = true;
    };
    const keyUp = (e) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    const update = () => {
      const player = playerRef.current;

      if (keys['ArrowLeft'] || keys['KeyA']) player.vx = -2;
      else if (keys['ArrowRight'] || keys['KeyD']) player.vx = 2;
      else player.vx *= 0.8;

      if (
        (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) &&
        player.onGround
      ) {
        player.vy = -7;
        player.onGround = false;
      }

      player.vy += 0.3; // gravity
      player.x += player.vx;
      player.y += player.vy;

      if (player.x < 0) player.x = 0;
      if (player.x + player.width > level.width)
        player.x = level.width - player.width;

      if (player.y + player.height > level.height) {
        player.y = level.height - player.height;
        player.vy = 0;
        player.onGround = true;
      } else {
        player.onGround = false;
      }

      level.platforms.forEach((p) => {
        if (
          player.x < p.x + p.width &&
          player.x + player.width > p.x &&
          player.y < p.y + p.height &&
          player.y + player.height > p.y
        ) {
          if (player.vy > 0 && player.y + player.height - player.vy <= p.y) {
            player.y = p.y - player.height;
            player.vy = 0;
            player.onGround = true;
          }
        }
      });

      level.coins.forEach((c) => {
        if (
          !c.collected &&
          player.x < c.x + 10 &&
          player.x + player.width > c.x &&
          player.y < c.y + 10 &&
          player.y + player.height > c.y
        ) {
          c.collected = true;
          player.score += 1;
        }
      });

      draw();
      animation = requestAnimationFrame(update);
    };

    const draw = () => {
      const player = playerRef.current;
      ctx.clearRect(0, 0, level.width, level.height);

      ctx.fillStyle = '#6b7280';
      level.platforms.forEach((p) => ctx.fillRect(p.x, p.y, p.width, p.height));

      ctx.fillStyle = 'gold';
      level.coins.forEach((c) => {
        if (!c.collected) ctx.fillRect(c.x, c.y, 10, 10);
      });

      ctx.fillStyle = '#2563eb';
      ctx.fillRect(player.x, player.y, player.width, player.height);

      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score: ${player.score}/${level.coins.length}`, 10, 20);
      if (player.score === level.coins.length) {
        ctx.fillText('You collected all coins!', 10, 40);
      }
    };

    update();

    return () => {
      cancelAnimationFrame(animation);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);

  return (
    <div className="w-full h-full bg-ub-cool-grey flex items-center justify-center">
      <canvas ref={canvasRef} width={level.width} height={level.height} />
    </div>
  );
};

export default Platformer;
