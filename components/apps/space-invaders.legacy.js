/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useRef, useEffect, useState } from 'react';
import GameLayout from './GameLayout';
import useAssetLoader from '../../hooks/useAssetLoader';

const EXTRA_LIFE_THRESHOLDS = [1000, 5000, 10000];
const BOSS_EVERY = 3;
const MAX_SHIELD_HP = 3;
const STREAK_THRESHOLD = 3;
const STREAK_MULTIPLIER = 2;

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

  const player = useRef({
    x: 0,
    y: 0,
    w: 20,
    h: 10,
    cooldown: 0,
    shield: false,
    shieldHp: 0,
    rapid: 0,
  });
  const invaders = useRef([]);
  const invDir = useRef(1);
  const enemyCooldown = useRef(1);
  const baseInterval = 0.6;
  const stepTimer = useRef(0);
  const waveTime = useRef(0);
  const playerBullets = useRef([]);
  const enemyBullets = useRef([]);
  const particles = useRef([]); // explosion particles
  const powerUps = useRef([]);
  const shelters = useRef([]);
  const ufo = useRef({ active: false, x: 0, y: 15, dir: 1 });
  const boss = useRef({
    active: false,
    x: 0,
    y: 40,
    w: 60,
    h: 20,
    hp: 0,
    maxHp: 0,
    dir: 1,
    cooldown: 2,
  });
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
    gain.gain.value = 0.1;
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
    gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
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
    hitStreak.current = 0;
    setScore(0);
    livesRef.current = 3;
    setLives(3);
    pattern.current = 0;
    nextExtraLife.current = 0;
    pausedRef.current = false;
    setIsPaused(false);
    player.current.shield = false;
    player.current.shieldHp = 0;
    boss.current.active = false;
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
  const hitStreak = useRef(0);
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
      for (let i = 0; i < n; i += 1)
        arr.push({ x: 0, y: 0, dx: 0, dy, active: false, hit: false });
      return arr;
    };
    playerBullets.current = createBulletPool(20, -200);
    enemyBullets.current = createBulletPool(50, 200);

    const createShelters = () => {
      const positions = [w * 0.2 - 20, w * 0.5 - 20, w * 0.8 - 20];
      const tiles = [];
      const tileSize = 10;
      positions.forEach((baseX) => {
        for (let r = 0; r < 2; r += 1) {
          for (let c = 0; c < 4; c += 1) {
            tiles.push({
              x: baseX + c * tileSize,
              y: h - 60 + r * tileSize,
              w: tileSize,
              h: tileSize,
              hp: 3,
            });
          }
        }
      });
      return tiles;
    };

    const spacing = 30;

    const setupWave = () => {
      const isBossStage = stageRef.current % BOSS_EVERY === 0;
      boss.current.active = false;
      if (isBossStage) {
        invaders.current = [];
        const hp = 20 + stageRef.current * 5;
        boss.current = {
          active: true,
          x: w / 2 - 30,
          y: 40,
          w: 60,
          h: 20,
          hp,
          maxHp: hp,
          dir: 1,
          cooldown: 2,
        };
        initialCount.current = 0;
      } else {
        const rows = 4 + (stageRef.current - 1);
        const cols = 8;
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
      }

      player.current.x = w / 2 - player.current.w / 2;
      player.current.cooldown = 0;
      player.current.shield = false;
      player.current.shieldHp = 0;
      player.current.rapid = 0;
      waveTime.current = 0;

      playerBullets.current.forEach((b) => {
        b.active = false;
      });
      enemyBullets.current.forEach((b) => {
        b.active = false;
      });
      powerUps.current = [];
      shelters.current = createShelters();
      ufo.current.active = false;
    };
    setupWaveRef.current = setupWave;
    setupWave();

    const handleKey = (e) => {
      if (e.code === 'Escape' && e.type === 'keydown') {
        togglePause();
        return;
      }
      keys.current[e.code] = e.type === 'keydown';
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);

    const shoot = (pool, x, y, freq, dx = 0) => {
      for (const b of pool) {
        if (!b.active) {
          b.x = x;
          b.y = y;
          b.dx = dx;
          b.active = true;
          b.hit = false;
          if (freq) playSound(freq);
          break;
        }
      }
    };

    const moveBullets = (pool, dt, mult = 1) => {
      for (const b of pool) {
        if (!b.active) continue;
        b.x += b.dx * dt * mult;
        b.y += b.dy * dt * mult;
        if (b.y < 0 || b.y > h || b.x < 0 || b.x > w) {
          b.active = false;
          if (pool === playerBullets.current && !b.hit) hitStreak.current = 0;
        }
      }
    };

    const enemyShoot = (x, y) => {
      const patternLevel = Math.floor(stageRef.current / 3);
      if (patternLevel <= 0) {
        shoot(enemyBullets.current, x, y, 200);
      } else if (patternLevel === 1) {
        shoot(enemyBullets.current, x, y, 200);
        shoot(enemyBullets.current, x, y, 200, -50);
        shoot(enemyBullets.current, x, y, 200, 50);
      } else {
        shoot(enemyBullets.current, x, y, 200);
        shoot(enemyBullets.current, x, y, 200, -70);
        shoot(enemyBullets.current, x, y, 200, 70);
        shoot(enemyBullets.current, x, y, 200, -40);
        shoot(enemyBullets.current, x, y, 200, 40);
      }
    };

    const spawnExplosion = (x, y, color) => {
      for (let i = 0; i < 20; i += 1) {
        particles.current.push({
          x,
          y,
          dx: (Math.random() - 0.5) * 100,
          dy: (Math.random() - 0.5) * 100,
          life: 0.5,
          color,
        });
      }
    };

    const addScore = (n) => {
      hitStreak.current += 1;
      const points =
        hitStreak.current >= STREAK_THRESHOLD ? n * STREAK_MULTIPLIER : n;
      scoreRef.current += points;
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
      hitStreak.current = 0;
      if (player.current.shield && player.current.shieldHp > 0) {
        player.current.shieldHp -= 1;
        if (player.current.shieldHp <= 0) player.current.shield = false;
        return;
      }
      spawnExplosion(
        player.current.x + player.current.w / 2,
        player.current.y + player.current.h / 2,
        'white',
      );
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

      waveTime.current += dt;

      const p = player.current;
      p.cooldown = Math.max(0, p.cooldown - dt);
      if (muzzleFlash.current > 0) muzzleFlash.current -= dt;
      if (hitFlash.current > 0) hitFlash.current -= dt;
      if (shake.current > 0) shake.current -= dt;
      if (bombWarning.current.time > 0) {
        bombWarning.current.time -= dt;
        if (bombWarning.current.time <= 0) {
          enemyShoot(bombWarning.current.x, bombWarning.current.y);
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

      let aliveInv = [];
      if (!boss.current.active) {
        enemyCooldown.current -= dt;
        aliveInv = invaders.current.filter((i) => i.alive);
        if (
          enemyCooldown.current <= 0 &&
          aliveInv.length &&
          bombWarning.current.time <= 0
        ) {
          const inv = aliveInv[Math.floor(Math.random() * aliveInv.length)];
          bombWarning.current = { time: 0.5, x: inv.x + 10, y: inv.y + 10 };
          enemyCooldown.current = 1 / (difficultyRef.current * stageRef.current);
        }
      } else {
        boss.current.cooldown -= dt;
        boss.current.x += boss.current.dir * 40 * dt;
        if (boss.current.x < 0 || boss.current.x + boss.current.w > w)
          boss.current.dir *= -1;
        if (boss.current.cooldown <= 0) {
          enemyShoot(boss.current.x + boss.current.w / 2, boss.current.y + boss.current.h);
          boss.current.cooldown = 1 / difficultyRef.current;
        }
      }

      moveBullets(playerBullets.current, dt);
      moveBullets(enemyBullets.current, dt, difficultyRef.current);
      for (const pu of powerUps.current) {
        if (!pu.active) continue;
        pu.y += 40 * dt;
        if (pu.y > h) pu.active = false;
      }

      particles.current.forEach((pt) => {
        pt.x += pt.dx * dt;
        pt.y += pt.dy * dt;
        pt.life -= dt;
      });
      particles.current = particles.current.filter((pt) => pt.life > 0);

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
            b.hit = true;
            addScore(10);
            playSound(400);
            spawnExplosion(inv.x + 10, inv.y + 7, 'lime');
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
            hitStreak.current = 0;
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
          b.hit = true;
          addScore(50);
          playSound(1000);
          spawnExplosion(
            ufo.current.x + 15,
            ufo.current.y + 7,
            '#ff00ff',
          );
        }
        if (
          boss.current.active &&
          b.x >= boss.current.x &&
          b.x <= boss.current.x + boss.current.w &&
          b.y >= boss.current.y &&
          b.y <= boss.current.y + boss.current.h
        ) {
          boss.current.hp -= 1;
          b.active = false;
          b.hit = true;
          addScore(20);
          playSound(600);
          if (boss.current.hp <= 0) {
            boss.current.active = false;
            spawnExplosion(
              boss.current.x + boss.current.w / 2,
              boss.current.y + boss.current.h / 2,
              'purple',
            );
            addScore(200);
            stageRef.current += 1;
            setStage(stageRef.current);
            pattern.current = (pattern.current + 1) % 2;
            setupWave();
          }
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

    shelters.current = shelters.current.filter((s) => s.hp > 0);

    if (!boss.current.active) {
      const aliveCount = aliveInv.length;
        const aliveRatio = aliveCount / initialCount.current || 1;
        let lowest = 0;
        for (const inv of aliveInv) if (inv.y > lowest) lowest = inv.y;
        const descent = lowest / h;
        const timeFactor = 1 + waveTime.current * 0.05;
        const interval =
          (baseInterval * aliveRatio) /
          (stageRef.current * (1 + descent) * difficultyRef.current * timeFactor);
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
      }

      if (!boss.current.active) {
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
      }

      for (const pu of powerUps.current) {
        if (!pu.active) continue;
        if (pu.x >= p.x && pu.x <= p.x + p.w && pu.y >= p.y && pu.y <= p.y + p.h) {
          pu.active = false;
          if (pu.type === 'shield') {
            p.shield = true;
            p.shieldHp = MAX_SHIELD_HP;
          } else p.rapid = 5;
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

      const glow = 5 + Math.sin(time / 200) * 2;
      ctx.save();
      ctx.fillStyle = 'lime';
      ctx.shadowColor = '#0f0';
      ctx.shadowBlur = glow;
      invaders.current.forEach((inv) => {
        if (inv.alive)
          ctx.fillRect(
            inv.x,
            inv.y + Math.sin(time / 200 + inv.phase) * 2,
            20,
            15,
          );
      });
      ctx.restore();
      if (bombWarning.current.time > 0) {
        ctx.fillStyle = 'red';
        ctx.fillRect(bombWarning.current.x - 4, bombWarning.current.y - 4, 8, 8);
      }

      particles.current.forEach((pt) => {
        ctx.globalAlpha = Math.max(pt.life * 2, 0);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 2, 2);
      });
      ctx.globalAlpha = 1;

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
        ctx.fillStyle = 'cyan';
        ctx.fillRect(
          p.x - 2,
          p.y - 6,
          ((p.w + 4) * p.shieldHp) / MAX_SHIELD_HP,
          2
        );
      }

      shelters.current.forEach((s) => {
        if (s.hp > 0) {
          const shade = ['#555', '#888', '#ccc'][s.hp - 1];
          ctx.fillStyle = shade;
          ctx.fillRect(s.x, s.y, s.w, s.h);
        }
      });

      if (ufo.current.active) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(ufo.current.x, ufo.current.y, 30, 15);
      }
      if (boss.current.active) {
        ctx.fillStyle = 'purple';
        ctx.fillRect(boss.current.x, boss.current.y, boss.current.w, boss.current.h);
        ctx.fillStyle = 'red';
        ctx.fillRect(
          boss.current.x,
          boss.current.y - 5,
          (boss.current.w * boss.current.hp) / boss.current.maxHp,
          3
        );
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
        </div>
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
