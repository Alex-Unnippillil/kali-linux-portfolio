import React, { useRef, useEffect } from 'react';

const SpaceInvaders = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    const player = { x: canvas.width / 2 - 20, y: canvas.height - 30, w: 40, h: 10, dx: 0 };
    const bullets = [];
    const aliens = [];
    const rows = 4;
    const cols = 8;
    const alienW = 30;
    const alienH = 20;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        aliens.push({ x: c * (alienW + 10) + 30, y: r * (alienH + 10) + 30, w: alienW, h: alienH });
      }
    }
    let alienDx = 1;

    const keyDown = (e) => {
      if (e.key === 'ArrowLeft') player.dx = -5;
      if (e.key === 'ArrowRight') player.dx = 5;
      if (e.key === ' ') {
        bullets.push({ x: player.x + player.w / 2 - 1, y: player.y, w: 2, h: 10, dy: -7 });
      }
    };

    const keyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') player.dx = 0;
    };

    const collision = (a, b) =>
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.h + a.y > b.y;

    const update = () => {
      player.x += player.dx;
      if (player.x < 0) player.x = 0;
      if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

      bullets.forEach((b, i) => {
        b.y += b.dy;
        if (b.y + b.h < 0) bullets.splice(i, 1);
      });

      let shiftDown = false;
      aliens.forEach((a) => {
        a.x += alienDx;
        if (a.x + a.w > canvas.width - 10 || a.x < 10) shiftDown = true;
      });
      if (shiftDown) {
        alienDx *= -1;
        aliens.forEach((a) => {
          a.y += 20;
        });
      }

      bullets.forEach((b, bi) => {
        aliens.forEach((a, ai) => {
          if (collision(b, a)) {
            aliens.splice(ai, 1);
            bullets.splice(bi, 1);
          }
        });
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(player.x, player.y, player.w, player.h);

      ctx.fillStyle = '#f00';
      bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.w, b.h));

      ctx.fillStyle = '#0ff';
      aliens.forEach((a) => ctx.fillRect(a.x, a.y, a.w, a.h));
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full bg-black" />;
};

export default SpaceInvaders;

