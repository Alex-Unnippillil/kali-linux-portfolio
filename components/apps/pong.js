import React, { useRef, useEffect, useState } from 'react';

const Pong = () => {
  const canvasRef = useRef(null);
  const resetRef = useRef(null);
  const [scores, setScores] = useState({ player: 0, cpu: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const paddleHeight = 80;
    const paddleWidth = 10;
    const player = { x: 10, y: height / 2 - paddleHeight / 2 };
    const cpu = { x: width - paddleWidth - 10, y: height / 2 - paddleHeight / 2 };
    const ball = { x: width / 2, y: height / 2, vx: 4, vy: 2, size: 8 };

    let playerScore = 0;
    let cpuScore = 0;
    const keys = { up: false, down: false };
    let animationId;

    const resetBall = () => {
      ball.x = width / 2;
      ball.y = height / 2;
      ball.vx = 4 * (Math.random() > 0.5 ? 1 : -1);
      ball.vy = 2 * (Math.random() > 0.5 ? 1 : -1);
    };

    resetRef.current = () => {
      playerScore = 0;
      cpuScore = 0;
      setScores({ player: 0, cpu: 0 });
      player.y = height / 2 - paddleHeight / 2;
      cpu.y = height / 2 - paddleHeight / 2;
      resetBall();
    };

    const draw = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'white';
      ctx.fillRect(player.x, player.y, paddleWidth, paddleHeight);
      ctx.fillRect(cpu.x, cpu.y, paddleWidth, paddleHeight);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
      ctx.fill();
    };

    const update = () => {
      if (keys.up) player.y -= 6;
      if (keys.down) player.y += 6;
      player.y = Math.max(0, Math.min(height - paddleHeight, player.y));

      const cpuCenter = cpu.y + paddleHeight / 2;
      if (cpuCenter < ball.y - 10) cpu.y += 4;
      else if (cpuCenter > ball.y + 10) cpu.y -= 4;
      cpu.y = Math.max(0, Math.min(height - paddleHeight, cpu.y));

      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.y < ball.size || ball.y > height - ball.size) ball.vy *= -1;

      if (
        ball.x - ball.size < player.x + paddleWidth &&
        ball.y > player.y &&
        ball.y < player.y + paddleHeight
      ) {
        ball.vx *= -1;
        ball.x = player.x + paddleWidth + ball.size;
      }

      if (
        ball.x + ball.size > cpu.x &&
        ball.y > cpu.y &&
        ball.y < cpu.y + paddleHeight
      ) {
        ball.vx *= -1;
        ball.x = cpu.x - ball.size;
      }

      if (ball.x < 0) {
        cpuScore += 1;
        setScores({ player: playerScore, cpu: cpuScore });
        resetBall();
      } else if (ball.x > width) {
        playerScore += 1;
        setScores({ player: playerScore, cpu: cpuScore });
        resetBall();
      }
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    const keyDown = (e) => {
      if (e.key === 'ArrowUp') keys.up = true;
      if (e.key === 'ArrowDown') keys.down = true;
    };

    const keyUp = (e) => {
      if (e.key === 'ArrowUp') keys.up = false;
      if (e.key === 'ArrowDown') keys.down = false;
    };

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    loop();

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const resetGame = () => {
    if (resetRef.current) resetRef.current();
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
      <canvas ref={canvasRef} width={600} height={400} className="bg-black" />
      <div className="mt-2">Player: {scores.player} | CPU: {scores.cpu}</div>
      <button
        className="mt-2 px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={resetGame}
      >
        Reset
      </button>
    </div>
  );
};

export default Pong;

