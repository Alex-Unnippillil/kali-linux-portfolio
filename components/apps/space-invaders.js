import React, { useRef, useEffect, useState } from 'react';
import GameLayout from './GameLayout';
import useAssetLoader from '../../hooks/useAssetLoader';

const EXTRA_LIFE_THRESHOLDS = [1000, 5000, 10000];

const SpaceInvaders = () => {
  const { loading, error } = useAssetLoader({
    images: ['/themes/Yaru/status/ubuntu_white_hex.svg'],
    sounds: [],
  });

  const canvasRef = useRef(null);
  const reqRef = useRef();
  const keys = useRef({});
  const touch = useRef({ left: false, right: false, fire: false });
  const audioCtx = useRef(null);

  const player = useRef({ x: 0, y: 0, w: 20, h: 10, cooldown: 0, shield: false, rapid: 0 });
  const invaders = useRef([]);
  const invDir = useRef(1);
  const enemyCooldown = useRef(1);
  const baseInterval = 0.6;
  const stepTimer = useRef(0);
  const playerBullets = useRef([]);
  const enemyBullets = useRef([]);
  const powerUps = useRef([]);
  const shelters = useRef([]);
  const ufo = useRef({ active: false, x: 0, y: 15, dir: 1 });
  const ufoTimer = useRef(0);
  const initialCount = useRef(0);
  const pattern = useRef(0);
  const nextExtraLife = useRef(0);
  const setupWaveRef = useRef(() => {});
  const muzzleFlash = useRef(0);
  const hitFlash = useRef(0);
  const shake = useRef(0);
  const bombWarning = useRef({ time: 0, x: 0, y: 0 });
  const prefersReducedMotion = useRef(false);
  const [ariaMessage, setAriaMessage] = useState('');

  const [difficulty, setDifficulty] = useState(1);
  const difficultyRef = useRef(difficulty);
  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  const [isPaused, setIsPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const playSound = (freq) => {
    if (!soundRef.current) return;
    if (!audioCtx.current)
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    gain.gain.value = 0.05;
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.1);
  };

  const playSweep = (start, end, duration) => {
    if (!soundRef.current) return;
    if (!audioCtx.current)
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.frequency.setValueAtTime(start, audioCtx.current.currentTime);
    osc.frequency.linearRampToValueAtTime(
      end,
      audioCtx.current.currentTime + duration
    );
    gain.gain.setValueAtTime(0.05, audioCtx.current.currentTime);
    gain.gain.linearRampToValueAtTime(
      0,
      audioCtx.current.currentTime + duration
    );
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + duration);
  };

  const resetGame = () => {
    stageRef.current = 1;
    setStage(1);
    scoreRef.current = 0;
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    pattern.current = 0;
    nextExtraLife.current = 0;
    pausedRef.current = false;
    setIsPaused(false);
    setupWaveRef.current();
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
  };

  const [stage, setStage] = useState(1);
  const stageRef = useRef(stage);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const [lives, setLives] = useState(3);
  const livesRef = useRef(lives);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  const [score, setScore] = useState(0);
  const scoreRef = useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const [highScore, setHighScore] = useState(0);
  const highScoreRef = useRef(highScore);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);

  useEffect(() => {
    if (loading || error) return;
    const canvas = canvasRef.current;
    const stored = localStorage.getItem('si_highscore');
    if (stored) setHighScore(parseInt(stored, 10));
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const w = canvas.width;
    const h = canvas.height;

    player.current.x = w / 2 - player.current.w / 2;
    player.current.y = h - 30;

    const createBulletPool = (n, dy) => {
      const arr = [];
      for (let i = 0; i < n; i += 1) arr.push({ x: 0, y: 0, dy, active: false });
      return arr;
    };
    playerBullets.current = createBulletPool(20, -200);
    enemyBullets.current = createBulletPool(20, 200);

    const rows = 4;
    const cols = 8;
    const spacing = 30;

    const setupWave = () => {
      const invArr = [];
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          invArr.push({
            x: 30 + c * spacing,
            y: 30 + r * spacing,
            alive: true,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      invaders.current = invArr;
      initialCount.current = invArr.length;

      player.current.x = w / 2 - player.current.w / 2;
      player.current.cooldown = 0;
      player.current.shield = false;
      player.current.rapid = 0;

      playerBullets.current.forEach((b) => {
        b.active = false;
      });
      enemyBullets.current.forEach((b) => {
        b.active = false;
      });
      powerUps.current = [];
      shelters.current.forEach((s) => {
        s.hp = 6;
      });
      ufo.current.active = false;
    };
    setupWaveRef.current = setupWave;
    setupWave();

    shelters.current = [
      { x: w * 0.2 - 20, y: h - 60, w: 40, h: 20, hp: 6 },
      { x: w * 0.5 - 20, y: h - 60, w: 40, h: 20, hp: 6 },
      { x: w * 0.8 - 20, y: h - 60, w: 40, h: 20, hp: 6 },
    ];

    const handleKey = (e) => {
      keys.current[e.code] = e.type === 'keydown';
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const shoot = (pool, x, y, freq) => {
      for (const b of pool) {
        if (!b.active) {
          b.x = x;
          b.y = y;
          b.active = true;
          if (freq) playSound(freq);
          break;
        }
      }
    };

    const moveBullets = (pool, dt, mult = 1) => {
      for (const b of pool) {
        if (!b.active) continue;
        b.y += b.dy * dt * mult;
        if (b.y < 0 || b.y > h) b.active = false;
      }
    };

    const addScore = (n) => {
      scoreRef.current += n;
      setScore(scoreRef.current);

      if (
        nextExtraLife.current < EXTRA_LIFE_THRESHOLDS.length &&
        scoreRef.current >= EXTRA_LIFE_THRESHOLDS[nextExtraLife.current]
      ) {
        livesRef.current += 1;
        setLives(livesRef.current);
        nextExtraLife.current += 1;
      }

      if (scoreRef.current > highScoreRef.current) {
        highScoreRef.current = scoreRef.current;
        setHighScore(highScoreRef.current);
        localStorage.setItem('si_highscore', highScoreRef.current.toString());
      }
    };

    const loseLife = () => {
      if (player.current.shield) {
        player.current.shield = false;
        return;
      }
      livesRef.current -= 1;
      setLives(livesRef.current);
      if (livesRef.current <= 0) {
        if (scoreRef.current > highScoreRef.current) {
          highScoreRef.current = scoreRef.current;
          setHighScore(highScoreRef.current);
          localStorage.setItem('si_highscore', highScoreRef.current.toString());
        }
        stageRef.current = 1;
        setStage(1);
        scoreRef.current = 0;
        setScore(0);
        livesRef.current = 3;
        setLives(3);
        pattern.current = 0;
        nextExtraLife.current = 0;
      }
      setupWave();
    };

    let last = performance.now();
    const loop = (time) => {
      const dt = (time - last) / 1000;
      last = time;

      if (pausedRef.current) {
        reqRef.current = requestAnimationFrame(loop);
        return;
      }

      const p = player.current;
      p.cooldown -= dt;
      if (muzzleFlash.current > 0) muzzleFlash.current -= dt;
      if (hitFlash.current > 0) hitFlash.current -= dt;
      if (shake.current > 0) shake.current -= dt;
      if (bombWarning.current.time > 0) {
        bombWarning.current.time -= dt;
        if (bombWarning.current.time <= 0) {
          shoot(enemyBullets.current, bombWarning.current.x, bombWarning.current.y, 200);
        }
      }

      const left = keys.current['ArrowLeft'] || touch.current.left;
      const right = keys.current['ArrowRight'] || touch.current.right;
      if (left) p.x -= 100 * dt;
      if (right) p.x += 100 * dt;
      p.x = Math.max(0, Math.min(w - p.w, p.x));

      const fire = keys.current['Space'] || touch.current.fire;
      if (fire && p.cooldown <= 0) {
        shoot(playerBullets.current, p.x + p.w / 2, p.y, 800);
        p.cooldown = p.rapid > 0 ? 0.15 : 0.5;
        if (!prefersReducedMotion.current) muzzleFlash.current = 0.1;
      }
      if (p.rapid > 0) p.rapid -= dt;

      enemyCooldown.current -= dt;
      const aliveInv = invaders.current.filter((i) => i.alive);
      if (
        enemyCooldown.current <= 0 &&
        aliveInv.length &&
        bombWarning.current.time <= 0
      ) {
        const inv = aliveInv[Math.floor(Math.random() * aliveInv.length)];
        bombWarning.current = { time: 0.5, x: inv.x + 10, y: inv.y + 10 };
        enemyCooldown.current = 1 / difficultyRef.current;
      }

      moveBullets(playerBullets.current, dt);
      moveBullets(enemyBullets.current, dt, difficultyRef.current);
      for (const pu of powerUps.current) {
        if (!pu.active) continue;
        pu.y += 40 * dt;
        if (pu.y > h) pu.active = false;
      }

      // Player bullets collisions
      for (const b of playerBullets.current) {
        if (!b.active) continue;
        for (const inv of invaders.current) {
          if (
            inv.alive &&
            b.x >= inv.x &&
            b.x <= inv.x + 20 &&
            b.y >= inv.y &&
            b.y <= inv.y + 15
          ) {
            inv.alive = false;
            b.active = false;
            addScore(10);
            playSound(400);
            if (Math.random() < 0.1)
              powerUps.current.push({
                x: inv.x + 10,
                y: inv.y + 10,
                type: Math.random() < 0.5 ? 'shield' : 'rapid',
                active: true,
              });
            break;
          }
        }
        if (!b.active) continue;
        for (const s of shelters.current) {
          if (
            s.hp > 0 &&
            b.x >= s.x &&
            b.x <= s.x + s.w &&
            b.y >= s.y &&
            b.y <= s.y + s.h
          ) {
            s.hp -= 1;
            b.active = false;
            break;
          }
        }
        if (!b.active) continue;
        if (
          ufo.current.active &&
          b.x >= ufo.current.x &&
          b.x <= ufo.current.x + 30 &&
          b.y >= ufo.current.y &&
          b.y <= ufo.current.y + 15
        ) {
          ufo.current.active = false;
          b.active = false;
          addScore(50);
          playSound(1000);
        }
      }

      // Enemy bullets collisions
      for (const b of enemyBullets.current) {
        if (!b.active) continue;
        if (b.x >= p.x && b.x <= p.x + p.w && b.y >= p.y && b.y <= p.y + p.h) {
          b.active = false;
          if (!prefersReducedMotion.current) {
            hitFlash.current = 0.2;
            shake.current = 0.2;
          }
          loseLife();
          return requestAnimationFrame(loop);
        }
        for (const s of shelters.current) {
          if (
            s.hp > 0 &&
            b.x >= s.x &&
            b.x <= s.x + s.w &&
            b.y >= s.y &&
            b.y <= s.y + s.h
          ) {
            s.hp -= 1;
            b.active = false;
            break;
          }
        }
      }

      const aliveCount = aliveInv.length;
      const progress = 1 - aliveCount / initialCount.current;
      let lowest = 0;
      for (const inv of aliveInv) if (inv.y > lowest) lowest = inv.y;
      const descent = lowest / h;
      const interval =
        baseInterval /
        (stageRef.current * (1 + progress) * (1 + descent) * difficultyRef.current);
      stepTimer.current += dt;
      if (stepTimer.current >= interval) {
        stepTimer.current -= interval;
        let hitEdge = false;
        for (const inv of invaders.current) {
          if (!inv.alive) continue;
          inv.x += invDir.current * 10;
          if (pattern.current === 1) {
            inv.y += Math.sin(time / 200 + inv.phase) * 0.5;
          }
          if (inv.x < 10 || inv.x > w - 30) hitEdge = true;
        }
        if (hitEdge) {
          invDir.current *= -1;
          for (const inv of invaders.current) {
            if (inv.alive) inv.y += 10;
          }
        }
        const beepFreq = 200 + descent * 800;
        playSound(beepFreq);
      }

      if (aliveCount === 0) {
        stageRef.current += 1;
        setStage(stageRef.current);
        pattern.current = (pattern.current + 1) % 2;
        setupWave();
      }

      ufoTimer.current += dt;
      if (!ufo.current.active && ufoTimer.current > 15 && Math.random() < 0.02) {
        ufo.current.active = true;
        ufo.current.x = 0;
        ufo.current.dir = 1;
        ufoTimer.current = 0;
        playSweep(200, 400, 0.5);
        setAriaMessage('Saucer approaching');
        setTimeout(() => setAriaMessage(''), 1000);
      }
      if (ufo.current.active) {
        ufo.current.x += 60 * dt * ufo.current.dir;
        if (ufo.current.x > w) ufo.current.active = false;
      }

      for (const pu of powerUps.current) {
        if (!pu.active) continue;
        if (pu.x >= p.x && pu.x <= p.x + p.w && pu.y >= p.y && pu.y <= p.y + p.h) {
          pu.active = false;
          if (pu.type === 'shield') p.shield = true;
          else p.rapid = 5;
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (shake.current > 0 && !prefersReducedMotion.current) {
        const dx = (Math.random() - 0.5) * 5;
        const dy = (Math.random() - 0.5) * 5;
        ctx.translate(dx, dy);
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      if (muzzleFlash.current > 0) {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(p.x + p.w / 2 - 2, p.y - 6, 4, 6);
      }
      if (hitFlash.current > 0) {
        ctx.fillStyle = 'orange';
        ctx.fillRect(p.x - 5, p.y - 5, p.w + 10, p.h + 10);
      }

      ctx.fillStyle = 'lime';
      invaders.current.forEach((inv) => {
        if (inv.alive) ctx.fillRect(inv.x, inv.y, 20, 15);
      });
      if (bombWarning.current.time > 0) {
        ctx.fillStyle = 'red';
        ctx.fillRect(bombWarning.current.x - 4, bombWarning.current.y - 4, 8, 8);
      }

      ctx.fillStyle = 'red';
      playerBullets.current.forEach((b) => {
        if (b.active) ctx.fillRect(b.x - 1, b.y - 4, 2, 4);
      });

      ctx.fillStyle = 'yellow';
      enemyBullets.current.forEach((b) => {
        if (b.active) ctx.fillRect(b.x - 1, b.y, 2, 4);
      });

      powerUps.current.forEach((pu) => {
        if (!pu.active) return;
        ctx.fillStyle = pu.type === 'shield' ? 'cyan' : 'orange';
        ctx.fillRect(pu.x - 5, pu.y - 5, 10, 10);
      });

      if (p.shield) {
        ctx.strokeStyle = 'cyan';
        ctx.strokeRect(p.x - 2, p.y - 2, p.w + 4, p.h + 4);
      }

      shelters.current.forEach((s) => {
        if (s.hp > 0) {
          const shade = ['#555', '#666', '#777', '#888', '#aaa', '#ccc'][s.hp - 1];
          ctx.fillStyle = shade;
          ctx.fillRect(s.x, s.y, s.w, s.h);
        }
      });

      if (ufo.current.active) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(ufo.current.x, ufo.current.y, 30, 15);
      }

      ctx.restore();

      reqRef.current = requestAnimationFrame(loop);
    };

    reqRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(reqRef.current);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [loading, error]);

  const touchStart = (key) => () => {
    touch.current[key] = true;
  };
  const touchEnd = (key) => () => {
    touch.current[key] = false;
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
    <GameLayout stage={stage} lives={lives} score={score} highScore={highScore}>
      <div className="h-full w-full relative bg-black text-white">
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <div className="bg-gray-700 px-2 py-1 rounded flex items-center">
            <label htmlFor="difficulty" className="text-xs mr-2">
              Diff
            </label>
            <input
              id="difficulty"
              type="range"
              min="1"
              max="3"
              step="1"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className="w-16"
            />
          </div>
          <button
            className="bg-gray-700 px-2 py-1 rounded"
            onClick={resetGame}
          >
            Reset
          </button>
          <button
            className="bg-gray-700 px-2 py-1 rounded"
            onClick={togglePause}
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
