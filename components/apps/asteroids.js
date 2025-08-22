import React, { useRef, useEffect, useState } from 'react';
import AsteroidsEngine from '../../apps/asteroids/engine';

const Asteroids = () => {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const playerIdRef = useRef('');
  const remotePlayersRef = useRef({});
  const [leaderboard, setLeaderboard] = useState([]);
  const nameRef = useRef('');

  useEffect(() => {
    nameRef.current = prompt('Enter player name', '') || 'anon';
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      if (engineRef.current) {
        engineRef.current.width = canvas.width;
        engineRef.current.height = canvas.height;
      }
    }
    resize();
    window.addEventListener('resize', resize);

    engineRef.current = new AsteroidsEngine(canvas.width, canvas.height);

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/api/ws/asteroids`);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === 'welcome') {
        playerIdRef.current = msg.id;
        setLeaderboard(msg.leaderboard || []);
      } else if (msg.type === 'state') {
        if (msg.id !== playerIdRef.current) remotePlayersRef.current[msg.id] = msg;
      } else if (msg.type === 'leaderboard') {
        setLeaderboard(msg.leaderboard || []);
      }
    };

    const keys = {};
    const handleKeyDown = (e) => {
      keys[e.code] = true;
      if (e.code === 'Space') engineRef.current.shoot();
    };
    const handleKeyUp = (e) => {
      keys[e.code] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    function gameLoop() {
      const engine = engineRef.current;
      if (!engine) return;
      if (keys.ArrowLeft) engine.rotate(-1);
      if (keys.ArrowRight) engine.rotate(1);
      if (keys.ArrowUp) engine.thrust(0.0005);
      engine.update();

      const state = engine.getState();
      // send state
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'state',
            id: playerIdRef.current,
            x: state.ship.position.x,
            y: state.ship.position.y,
            angle: state.ship.angle,
            score: engine.score,
          })
        );
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // sprite batching for bullets
      ctx.fillStyle = 'white';
      ctx.beginPath();
      state.bullets.forEach((b) => {
        ctx.moveTo(b.position.x + 2, b.position.y);
        ctx.arc(b.position.x, b.position.y, 2, 0, Math.PI * 2);
      });
      ctx.fill();

      // asteroid batch
      ctx.strokeStyle = 'white';
      ctx.beginPath();
      state.asteroids.forEach((a) => {
        ctx.moveTo(a.position.x + a.circleRadius, a.position.y);
        ctx.arc(a.position.x, a.position.y, a.circleRadius, 0, Math.PI * 2);
      });
      ctx.stroke();

      // ship
      ctx.save();
      ctx.translate(state.ship.position.x, state.ship.position.y);
      ctx.rotate(state.ship.angle);
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-12, 8);
      ctx.lineTo(-12, -8);
      ctx.closePath();
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.restore();

      // power-ups
      ctx.fillStyle = 'yellow';
      ctx.beginPath();
      state.powerUps.forEach((p) => {
        ctx.moveTo(p.body.position.x + 5, p.body.position.y);
        ctx.arc(p.body.position.x, p.body.position.y, 5, 0, Math.PI * 2);
      });
      ctx.fill();

      // remote players
      Object.values(remotePlayersRef.current).forEach((pl) => {
        ctx.save();
        ctx.translate(pl.x, pl.y);
        ctx.rotate(pl.angle);
        ctx.strokeStyle = 'gray';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-12, 8);
        ctx.lineTo(-12, -8);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      });

      ctx.fillStyle = 'white';
      ctx.font = '16px monospace';
      ctx.fillText(`Score: ${state.score}`, 10, 20);
      ctx.fillText(`Level: ${state.level}`, 10, 40);

      requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: 'score', name: nameRef.current, score: engineRef.current?.score || 0 })
        );
        ws.close();
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas ref={canvasRef} className="w-full h-full bg-black" />
      <div className="absolute top-2 right-2 text-white text-xs bg-black bg-opacity-50 p-2">
        <div className="font-bold">Leaderboard</div>
        {leaderboard.map((l, i) => (
          <div key={i}>{`${l.name}: ${l.score}`}</div>
        ))}
      </div>
    </div>
  );
};

export default Asteroids;
