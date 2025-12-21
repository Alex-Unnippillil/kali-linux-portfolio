import React, { useEffect, useRef, useState } from 'react';
import GameLayout from './GameLayout';
import GameLoop from './Games/common/loop/GameLoop';
import useAssetLoader from '../../hooks/useAssetLoader';
import Shield from '../../games/space-invaders/components/Shield';
import {
  createGame,
  invaderWorldPosition,
  step,
} from '../../games/space-invaders/logic';

const KEY_LEFT = ['ArrowLeft', 'KeyA'];
const KEY_RIGHT = ['ArrowRight', 'KeyD'];
const KEY_FIRE = ['Space'];

const SpaceInvaders = () => {
  const { loading, error } = useAssetLoader({
    images: ['/themes/Yaru/status/ubuntu_white_hex.svg'],
    sounds: [],
  });

  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const inputRef = useRef({ left: false, right: false, fire: false });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [stage, setStage] = useState(1);
  const [ariaMessage, setAriaMessage] = useState('');
  const [sound, setSound] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [shieldHp, setShieldHp] = useState(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const stageRef = useRef(1);
  const shieldRef = useRef(0);
  const pausedRef = useRef(false);
  const audioCtx = useRef(null);
  const soundRef = useRef(sound);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  const playTone = (freq, duration = 0.1) => {
    if (!soundRef.current) return;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + duration);
  };

  useEffect(() => {
    if (loading || error) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    gameRef.current = createGame({ width: canvas.width, height: canvas.height, seed: 'space-default' });

    scoreRef.current = gameRef.current.score;
    livesRef.current = gameRef.current.player.lives;
    stageRef.current = gameRef.current.stage;
    shieldRef.current = gameRef.current.player.shieldHp;
    setShieldHp(shieldRef.current);

    const draw = () => {
      const game = gameRef.current;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, game.width, game.height);

      ctx.fillStyle = 'white';
      ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);

      ctx.fillStyle = '#5eead4';
      game.invaders.forEach((inv) => {
        if (!inv.alive) return;
        const pos = invaderWorldPosition(game, inv);
        ctx.fillRect(pos.x, pos.y, pos.w, pos.h);
      });

      ctx.fillStyle = '#a855f7';
      game.bullets.forEach((b) => {
        if (!b.active) return;
        ctx.fillRect(b.x - 2, b.y - 6, 4, 10);
      });

      ctx.fillStyle = '#22c55e';
      game.bunkers.forEach((tile) => {
        ctx.globalAlpha = tile.hp / 3;
        ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
        ctx.globalAlpha = 1;
      });

      ctx.fillStyle = '#fbbf24';
      game.powerUps.forEach((p) => {
        if (!p.active) return;
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      });

      if (game.ufo.active) {
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(game.ufo.x, game.ufo.y, 30, 15);
      }
    };

    const tick = (dtMs) => {
      if (pausedRef.current) return;
      const game = gameRef.current;
      const events = step(game, inputRef.current, dtMs);
      if (game.score !== scoreRef.current) {
        scoreRef.current = game.score;
        setScore(game.score);
      }
      if (game.player.lives !== livesRef.current) {
        livesRef.current = game.player.lives;
        setLives(game.player.lives);
      }
      if (game.stage !== stageRef.current) {
        stageRef.current = game.stage;
        setStage(game.stage);
      }
      if (game.player.shieldHp !== shieldRef.current) {
        shieldRef.current = game.player.shieldHp;
        setShieldHp(game.player.shieldHp);
      }
      events.forEach((event) => {
        if (event.type === 'shoot') {
          playTone(event.who === 'player' ? 800 : 240, 0.07);
        }
        if (event.type === 'hit') {
          playTone(event.target === 'invader' ? 520 : 260, 0.05);
        }
        if (event.type === 'powerup_spawn') {
          setAriaMessage(`${event.power} power-up spawned`);
        }
        if (event.type === 'powerup_pickup') {
          setAriaMessage(`${event.power} collected`);
        }
      });
    };

    const loop = new GameLoop(tick, undefined, { fps: 60, maxDt: 50, render: () => draw() });
    loop.start();

    const onKey = (e) => {
      if (e.code === 'Escape' && e.type === 'keydown') {
        pausedRef.current = !pausedRef.current;
        setIsPaused(pausedRef.current);
        return;
      }
      if (KEY_LEFT.includes(e.code)) inputRef.current.left = e.type === 'keydown';
      if (KEY_RIGHT.includes(e.code)) inputRef.current.right = e.type === 'keydown';
      if (KEY_FIRE.includes(e.code)) inputRef.current.fire = e.type === 'keydown';
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      loop.stop();
    };
  }, [loading, error]);

  const touchStart = (key) => () => {
    inputRef.current[key] = true;
  };
  const touchEnd = (key) => () => {
    inputRef.current[key] = false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-white bg-black">
        Failed to load assets.
      </div>
    );
  }

  return (
    <GameLayout gameId="space-invaders">
      <div className="h-full w-full relative bg-black text-white">
        <canvas ref={canvasRef} className="w-full h-full" />
        {isPaused && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <span className="text-xl">Paused</span>
          </div>
        )}
        <div className="absolute top-2 left-2 text-xs flex gap-4 z-10">
          <span>Lives: {lives}</span>
          <span>Score: {score}</span>
          <span>Stage: {stage}</span>
        </div>
        <div className="absolute top-2 right-2 flex gap-2 z-10 items-center">
          <Shield hp={shieldHp} maxHp={3} label="Shield" />
          <button
            className="bg-gray-700 px-2 py-1 rounded"
            onClick={() => {
              pausedRef.current = !pausedRef.current;
              setIsPaused(pausedRef.current);
            }}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="bg-gray-700 px-2 py-1 rounded"
            onClick={() => setSound((s) => !s)}
          >
            {sound ? 'Sound On' : 'Sound Off'}
          </button>
        </div>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-8 md:hidden">
          <button
            className="bg-gray-700 px-4 py-2 rounded"
            onTouchStart={touchStart('left')}
            onTouchEnd={touchEnd('left')}
          >
            ◀
          </button>
          <button
            className="bg-gray-700 px-4 py-2 rounded"
            onTouchStart={touchStart('fire')}
            onTouchEnd={touchEnd('fire')}
          >
            🔥
          </button>
          <button
            className="bg-gray-700 px-4 py-2 rounded"
            onTouchStart={touchStart('right')}
            onTouchEnd={touchEnd('right')}
          >
            ▶
          </button>
        </div>
        <div aria-live="polite" className="sr-only">
          {ariaMessage}
        </div>
      </div>
    </GameLayout>
  );
};

export default SpaceInvaders;
