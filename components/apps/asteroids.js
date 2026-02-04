import React, { useEffect, useRef, useState } from 'react';
import GameLoop from './Games/common/loop/GameLoop';
import { getMapping } from './Games/common/input-remap/useInputMapping';
import GameLayout from './GameLayout';
import { createGame, resize as resizeGame, tick } from './asteroids-engine';
import { POWER_UPS } from './asteroids-utils';
import useGameControls from './useGameControls';
import useOPFS from '../../hooks/useOPFS';

const DEFAULT_MAP = {
  thrust: 'ArrowUp',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  fire: ' ',
  hyperspace: 'h',
};

const drawCircle = (ctx, x, y, r, color, fill = false) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = color;
    ctx.stroke();
  }
};

const interpolate = (prev, next, alpha) => prev * (1 - alpha) + next * alpha;

const renderGame = (ctx, game, alpha, worldW, worldH) => {
  if (!game) return;
  ctx.clearRect(0, 0, worldW, worldH);
  const ship = game.ship;
  const sx = interpolate(ship.px, ship.x, alpha);
  const sy = interpolate(ship.py, ship.y, alpha);
  const angle = ship.angle;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.strokeStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-12, -8);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.stroke();
  if (ship.shield > 0) drawCircle(ctx, 0, 0, ship.r + 4, 'cyan');
  ctx.restore();

  game.asteroids.forEach((a) => {
    const x = interpolate(a.px, a.x, alpha);
    const y = interpolate(a.py, a.y, alpha);
    drawCircle(ctx, x, y, a.r, 'white');
  });

  game.bullets.forEach((b) => {
    if (!b.active) return;
    const x = interpolate(b.px, b.x, alpha);
    const y = interpolate(b.py, b.y, alpha);
    drawCircle(ctx, x, y, b.r, 'yellow', true);
  });

  if (game.ufo.active) {
    const x = interpolate(game.ufo.px, game.ufo.x, alpha);
    const y = interpolate(game.ufo.py, game.ufo.y, alpha);
    drawCircle(ctx, x, y, game.ufo.r, 'purple');
  }

  game.ufoBullets.forEach((b) => {
    const x = interpolate(b.px, b.x, alpha);
    const y = interpolate(b.py, b.y, alpha);
    drawCircle(ctx, x, y, b.r, 'red', true);
  });

  if (game.ghostShip) {
    const x = interpolate(game.ghostShip.px ?? game.ghostShip.x, game.ghostShip.x, alpha);
    const y = interpolate(game.ghostShip.py ?? game.ghostShip.y, game.ghostShip.y, alpha);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(game.ghostShip.angle);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.6)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-12, 8);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
  }

  game.powerUps.forEach((p) => {
    const x = interpolate(p.px ?? p.x, p.x, alpha);
    const y = interpolate(p.py ?? p.y, p.y, alpha);
    drawCircle(
      ctx,
      x,
      y,
      p.r,
      p.type === POWER_UPS.SHIELD ? 'cyan' : p.type === POWER_UPS.RAPID_FIRE ? 'yellow' : 'lime',
    );
  });

  // Radar
  const radarSize = 80;
  const radarX = worldW - radarSize - 10;
  const radarY = 10;
  ctx.save();
  ctx.strokeStyle = '#0f0';
  ctx.strokeRect(radarX, radarY, radarSize, radarSize);
  const scaleX = radarSize / worldW;
  const scaleY = radarSize / worldH;
  ctx.fillStyle = '#fff';
  ctx.fillRect(radarX + sx * scaleX - 1, radarY + sy * scaleY - 1, 3, 3);
  ctx.fillStyle = '#0f0';
  game.asteroids.forEach((a) => {
    ctx.fillRect(radarX + a.x * scaleX - 1, radarY + a.y * scaleY - 1, 2, 2);
  });
  if (game.ufo.active) {
    ctx.fillStyle = '#f00';
    ctx.fillRect(radarX + game.ufo.x * scaleX - 1, radarY + game.ufo.y * scaleY - 1, 3, 3);
  }
  ctx.restore();

  game.inventory.forEach((type, i) => {
    ctx.beginPath();
    ctx.strokeStyle =
      type === POWER_UPS.SHIELD ? 'cyan' : type === POWER_UPS.RAPID_FIRE ? 'yellow' : 'lime';
    ctx.arc(10 + i * 20, 80, 8, 0, Math.PI * 2);
    ctx.stroke();
  });

  if (game.waveBannerTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.waveBannerTimer / 30);
    ctx.fillStyle = 'white';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(game.waveBannerText, worldW / 2, worldH / 2);
    ctx.restore();
  }
};

const Asteroids = () => {
  const canvasRef = useRef(null);
  const controlsRef = useRef(useGameControls(canvasRef, 'asteroids'));
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [restartKey, setRestartKey] = useState(0);
  const [liveText, setLiveText] = useState('');
  const [selectingLevel, setSelectingLevel] = useState(true);
  const [startLevelNum, setStartLevelNum] = useState(1);
  const loopRef = useRef(null);
  const gameRef = useRef(null);
  const worldRef = useRef({ w: 0, h: 0 });
  const inventoryRef = useRef([]);
  const [inventory, setInventory] = useState([]);
  const [highScore, setHighScore] = useState(0);
  const [lastScore, setLastScore] = useState(0);
  const [stage, setStage] = useState(startLevelNum);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [multiplier, setMultiplier] = useState(1);
  const highScoreRef = useRef(0);
  const lastScoreRef = useRef(0);
  const stageRef = useRef(stage);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const multiplierRef = useRef(multiplier);
  const [saveData, setSaveData, saveReady] = useOPFS('asteroids-save.json', { upgrades: [], ghost: [] });
  const saveDataRef = useRef(saveData);
  const inventoryUseRef = useRef(null);
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  useEffect(() => {
    const hs = Number(localStorage.getItem('asteroids-highscore') || 0);
    const ls = Number(localStorage.getItem('asteroids-lastscore') || 0);
    setHighScore(hs);
    setLastScore(ls);
    highScoreRef.current = hs;
    lastScoreRef.current = ls;
  }, []);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);
  useEffect(() => {
    lastScoreRef.current = lastScore;
  }, [lastScore]);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    multiplierRef.current = multiplier;
  }, [multiplier]);
  useEffect(() => {
    saveDataRef.current = saveData;
  }, [saveData]);
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    if (!saveReady || selectingLevel) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const worldW = canvas.clientWidth;
      const worldH = canvas.clientHeight;
      worldRef.current = { w: worldW, h: worldH };
      canvas.width = Math.floor(worldW * dpr);
      canvas.height = Math.floor(worldH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gameRef.current) resizeGame(gameRef.current, worldW, worldH);
    };

    resize();
    window.addEventListener('resize', resize);

    const game = createGame({
      worldW: worldRef.current.w,
      worldH: worldRef.current.h,
      startLevel: startLevelNum,
      saveData: saveDataRef.current,
    });
    gameRef.current = game;
    inventoryRef.current = [];
    setInventory([]);
    setStage(game.level);
    setScore(game.score);
    setLives(game.lives);
    setMultiplier(game.multiplier);

    const handleInventoryUse = (e) => {
      if (e.key >= '1' && e.key <= '9') {
        inventoryUseRef.current = Number(e.key) - 1;
      }
    };
    window.addEventListener('keydown', handleInventoryUse);

    const processEvents = () => {
      game.events.forEach((evt) => {
        if (evt.type === 'inventory') setInventory(evt.inventory);
        if (evt.type === 'banner') setLiveText(evt.text);
        if (evt.type === 'level') {
          if (stageRef.current !== evt.level) setStage(evt.level);
          setLiveText(`Wave ${evt.level}`);
        }
        if (evt.type === 'lives') {
          if (livesRef.current !== evt.lives) setLives(evt.lives);
          setLiveText(`Lives ${evt.lives}`);
        }
        if (evt.type === 'hud') {
          if (scoreRef.current !== evt.score) setScore(evt.score);
          if (livesRef.current !== evt.lives) setLives(evt.lives);
          if (multiplierRef.current !== evt.multiplier) setMultiplier(evt.multiplier);
        }
        if (evt.type === 'gameOver') {
          setLiveText(`Game over. Score ${evt.score}`);
          const newHigh = Math.max(evt.score, highScoreRef.current);
          setHighScore(newHigh);
          setLastScore(evt.score);
          try {
            localStorage.setItem('asteroids-highscore', String(newHigh));
            localStorage.setItem('asteroids-lastscore', String(evt.score));
          } catch {}
          const updated = { upgrades: saveDataRef.current.upgrades, ghost: evt.ghostData };
          saveDataRef.current = updated;
          setSaveData(updated);
          setSelectingLevel(true);
        }
      });
    };

    const render = (alpha) => {
      renderGame(ctx, gameRef.current, alpha, worldRef.current.w, worldRef.current.h);
    };

    const loop = new GameLoop(
      (dt) => {
        if (pausedRef.current) return;
        const { keys, joystick, fire, hyperspace } = controlsRef.current;
        const map = getMapping('asteroids', DEFAULT_MAP);
        const turn =
          (keys[map.left] ? -1 : 0) + (keys[map.right] ? 1 : 0) + (joystick.active ? joystick.x : 0);
        const thrust =
          (keys[map.thrust] ? 1 : 0) + (joystick.active ? -joystick.y : 0);
        const input = {
          turn,
          thrust,
          fire,
          hyperspace,
          useInventory: inventoryUseRef.current,
        };
        controlsRef.current.fire = false;
        controlsRef.current.hyperspace = false;
        inventoryUseRef.current = null;
        tick(gameRef.current, input, dt);
        processEvents();
      },
      undefined,
      { fps: 60, maxDt: 32, render, interpolation: true },
    );

    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', handleInventoryUse);
    };
  }, [dpr, restartKey, saveReady, selectingLevel, startLevelNum, setSaveData]);

  const restartGame = () => {
    pausedRef.current = false;
    setPaused(false);
    setSelectingLevel(true);
    setRestartKey((k) => k + 1);
  };

  const resetProgress = () => {
    const cleared = { upgrades: [], ghost: [] };
    saveDataRef.current = cleared;
    setSaveData(cleared);
    restartGame();
  };

  return (
    <GameLayout
      gameId="asteroids"
      stage={stage}
      lives={lives}
      score={score}
      highScore={highScore}
      paused={paused}
      onPauseChange={(p) => {
        pausedRef.current = p;
        setPaused(p);
        const loop = loopRef.current;
        if (!loop) return;
        if (p) loop.stop();
        else loop.start();
      }}
      onRestart={restartGame}
    >
      {selectingLevel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 text-white space-y-2 z-50">
          <div>Select Starting Level</div>
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setStartLevelNum(lvl);
                setSelectingLevel(false);
                setRestartKey((k) => k + 1);
              }}
              className="px-2 py-1 bg-gray-700 rounded"
            >
              Level {lvl}
            </button>
          ))}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="bg-black w-full h-full touch-none"
        aria-label="Asteroids game canvas"
      />
      <div aria-live="polite" className="sr-only">
        {liveText}
      </div>
      <div className="absolute bottom-2 right-2 z-40">
        <button type="button" onClick={resetProgress} className="px-2 py-1 bg-gray-700 text-white rounded">
          Reset Progress
        </button>
      </div>
    </GameLayout>
  );
};

export default Asteroids;
