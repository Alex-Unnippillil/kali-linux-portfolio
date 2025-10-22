import React, { useRef, useEffect, useState, useCallback } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import useGameControls from './useGameControls';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings as useGlobalSettings } from '../../hooks/useSettings';
import { SettingsProvider, useSettings as useGameSettings } from './GameSettingsContext';
import { getBallSpin } from '../../games/pong/physics';

// Basic timing constants so the simulation is consistent across refresh rates
const FRAME_TIME = 1000 / 60; // ideal frame time in ms
const WIN_POINTS = 5; // points to win a game
const MAX_BALL_SPEED = 600; // maximum ball speed in px/s
const HIT_SPEEDUP = 1.05; // speed multiplier when the ball hits a paddle

// Dynamic trail length based on ball speed (1-2 frame trail)
const MIN_TRAIL = 4;
const MAX_TRAIL = 14;
const MAX_PADDLE_TRAIL = 12;
const SPARK_POOL = 32;

// Pong component with spin, adjustable AI and experimental WebRTC multiplayer
const WIDTH = 600;
const HEIGHT = 400;

const PongInner = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const resetRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const frameRef = useRef(0);

  const [scores, setScores] = useState({ player: 0, opponent: 0 });
  const { difficulty, setDifficulty } = useGameSettings();
  const [match, setMatch] = useState({ player: 0, opponent: 0 });
  const [matchWinner, setMatchWinner] = useState(null);
  const [mode, setMode] = useState('cpu'); // 'cpu', 'local', 'online', or 'practice'
  const [offerSDP, setOfferSDP] = useState('');
  const [answerSDP, setAnswerSDP] = useState('');
  const [connected, setConnected] = useState(false);
  const audioCtxRef = useRef(null);
  const [sound, setSound] = useState(true);
  const ambienceRef = useRef(null);
  const [ambience, setAmbience] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [rally, setRally] = useState(0);
  const { pongSpin } = useGlobalSettings();
  const [highScore, setHighScore] = usePersistentState(
    'pong_highscore',
    0,
    (v) => typeof v === 'number',
  );
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const speedRef = useRef(1);
  const [aiIndicator, setAiIndicator] = useState('Tracking...');
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [lastInput, setLastInput] = useState('Keyboard');
  const [history, setHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('pongHistory')) || [];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (!sound && ambience) {
      setAmbience(false);
    }
  }, [sound, ambience]);

  useEffect(
    () => () => {
      if (ambienceRef.current) {
        try {
          ambienceRef.current.source.stop();
        } catch {}
        ambienceRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!ambience) {
      if (ambienceRef.current) {
        try {
          ambienceRef.current.source.stop();
        } catch {}
        ambienceRef.current = null;
      }
      return;
    }

    if (!sound) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        const rnd = Math.random() * 2 - 1;
        data[i] = rnd * 0.2;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      ambienceRef.current = { source, gain };
    } catch {
      setAmbience(false);
    }
  }, [ambience, sound]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updatePads = () => {
      if (!navigator.getGamepads) {
        setGamepadConnected(false);
        return;
      }
      const pads = navigator.getGamepads();
      setGamepadConnected(Array.from(pads || []).some((pad) => !!pad));
    };
    const markKeyboard = () => setLastInput('Keyboard');
    const markTouch = () => setLastInput('Touch');
    const markGamepad = () => {
      setLastInput('Gamepad');
      updatePads();
    };

    updatePads();
    window.addEventListener('keydown', markKeyboard);
    window.addEventListener('pointerdown', markTouch, { passive: true });
    window.addEventListener('gamepadconnected', markGamepad);
    window.addEventListener('gamepaddisconnected', updatePads);
    return () => {
      window.removeEventListener('keydown', markKeyboard);
      window.removeEventListener('pointerdown', markTouch, { passive: true });
      window.removeEventListener('gamepadconnected', markGamepad);
      window.removeEventListener('gamepaddisconnected', updatePads);
    };
  }, []);

  useEffect(() => {
    const base = mode === 'practice' ? speedMultiplier : 1;
    const ramp = 1 + Math.min(rally * 0.05, 1); // up to 2x
    speedRef.current = base * ramp;
  }, [speedMultiplier, rally, mode]);

  useEffect(() => {
    if (rally > highScore) setHighScore(rally);
  }, [rally, highScore, setHighScore]);

    const playSound = useCallback(
      (freq) => {
        if (!sound) return;
        try {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
          }
          const ctx = audioCtxRef.current;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        } catch {
          // ignore audio errors
        }
      },
      [sound],
    );

  const controls = useRef(useGameControls(canvasRef));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const handleTouch = (e) => {
      const rect = canvas.getBoundingClientRect();
      controls.current.touchY = null;
      controls.current.touchY2 = null;
      for (let i = 0; i < e.touches.length; i += 1) {
        const t = e.touches[i];
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        if (x < rect.width / 2) controls.current.touchY = y;
        else controls.current.touchY2 = y;
      }
    };
    const endTouch = () => {
      controls.current.touchY = null;
      controls.current.touchY2 = null;
    };
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', endTouch);
    canvas.addEventListener('touchcancel', endTouch);
    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('touchmove', handleTouch);
      canvas.removeEventListener('touchend', endTouch);
      canvas.removeEventListener('touchcancel', endTouch);
    };
  }, [canvasRef]);

  useEffect(() => {
    if (mode !== 'online' || !channelRef.current) return undefined;
    const send = () => {
      channelRef.current.send(
        JSON.stringify({
          type: 'input',
          frame: frameRef.current + 1,
          up: controls.current.keys['ArrowUp'] || false,
          down: controls.current.keys['ArrowDown'] || false,
        })
      );
    };
    window.addEventListener('keydown', send);
    window.addEventListener('keyup', send);
    return () => {
      window.removeEventListener('keydown', send);
      window.removeEventListener('keyup', send);
    };
  }, [mode, pongSpin]);

  // Main game effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = WIDTH;
    const height = HEIGHT;

    const paddleHeight = 80;
    const paddleWidth = 10;

    const player = {
      x: 10,
      y: height / 2 - paddleHeight / 2,
      vy: 0,
      scale: 1,
      widthScale: 1,
      rot: 0,
      glow: 0,
    };
    const opponent = {
      x: width - paddleWidth - 10,
      y: height / 2 - paddleHeight / 2,
      vy: 0,
      scale: 1,
      widthScale: 1,
      rot: 0,
      glow: 0,
    };
    const ball = {
      x: width / 2,
      y: height / 2,
      vx: 200,
      vy: 120,
      size: 8,
      scale: 1,
    };

    const ballTrail = [];
    const paddleTrail = { player: [], opponent: [] };
    const sparks = [];
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = motionQuery.matches;
    const handleMotionChange = (e) => {
      prefersReducedMotion = e.matches;
    };
    if (motionQuery.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (motionQuery.addListener) {
      motionQuery.addListener(handleMotionChange);
    }

    let playerScore = 0;
    let oppScore = 0;
    const remoteKeys = { up: false, down: false, touchY: null };

    let animationId;
    let lastTime = performance.now();
    let frame = 0;

    // history for simple rollback (120 frames ~2s)
    const history = [];
    const saveState = () => {
      history[frame % 120] = {
        frame,
        playerY: player.y,
        playerVy: player.vy,
        oppY: opponent.y,
        oppVy: opponent.vy,
        ballX: ball.x,
        ballY: ball.y,
        ballVx: ball.vx,
        ballVy: ball.vy,
      };
    };
    const loadState = (f) => {
      const state = history[f % 120];
      if (!state || state.frame !== f) return false;
      player.y = state.playerY;
      player.vy = state.playerVy;
      opponent.y = state.oppY;
      opponent.vy = state.oppVy;
      ball.x = state.ballX;
      ball.y = state.ballY;
      ball.vx = state.ballVx;
      ball.vy = state.ballVy;
      return true;
    };

    let rngSeed = 1;
    const rand = () => {
      // simple LCG for deterministic randomness
      rngSeed = (rngSeed * 1664525 + 1013904223) % 4294967296;
      return rngSeed / 4294967296;
    };

    const resetBall = (dir = rand() > 0.5 ? 1 : -1) => {
      ball.x = width / 2;
      ball.y = height / 2;
      ball.vx = 200 * dir * speedRef.current;
      // ensure vertical speed has some variance but avoids near-zero values
      let vy = (rand() * 40 + 40) * speedRef.current; // 40-80
      if (rand() > 0.5) vy *= -1;
      ball.vy = vy;
      ballTrail.length = 0;
    };

    resetRef.current = () => {
      playerScore = 0;
      oppScore = 0;
      setScores({ player: 0, opponent: 0 });
      setMatch({ player: 0, opponent: 0 });
      setMatchWinner(null);
      setPaused(false);
      pausedRef.current = false;
      player.y = height / 2 - paddleHeight / 2;
      opponent.y = height / 2 - paddleHeight / 2;
      player.rot = 0;
      opponent.rot = 0;
      player.glow = 0;
      opponent.glow = 0;
      setRally(0);

      resetBall();
    };

    const draw = () => {
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, '#0f172a');
      bg.addColorStop(0.5, '#312e81');
      bg.addColorStop(1, '#111827');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      const midGlow = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        Math.max(width, height) / 2,
      );
      midGlow.addColorStop(0, 'rgba(96, 165, 250, 0.2)');
      midGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = midGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 14]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 20);
      ctx.lineTo(width / 2, height - 20);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!prefersReducedMotion) {
        ctx.fillStyle = '#e0f2fe';
        for (let i = 0; i < ballTrail.length; i += 1) {
          const t = ballTrail[i];
          const progress = (i + 1) / ballTrail.length;
          ctx.globalAlpha = progress * 0.25;
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.size * (0.6 + progress * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }

        const renderPaddleTrail = (trail, color) => {
          for (let i = 0; i < trail.length; i += 1) {
            const t = trail[i];
            const progress = (i + 1) / trail.length;
            ctx.globalAlpha = progress * 0.2;
            ctx.fillStyle = color;
            ctx.fillRect(
              t.x,
              t.y,
              paddleWidth,
              paddleHeight,
            );
          }
        };

        ctx.globalAlpha = 1;
        renderPaddleTrail(paddleTrail.player, 'rgba(96, 165, 250, 0.7)');
        if (mode !== 'practice') {
          renderPaddleTrail(paddleTrail.opponent, 'rgba(250, 204, 21, 0.7)');
        }
        ctx.globalAlpha = 1;

        for (let i = sparks.length - 1; i >= 0; i -= 1) {
          const s = sparks[i];
          const alpha = Math.max(s.life / s.maxLife, 0);
          if (alpha <= 0) continue;
          ctx.fillStyle = `rgba(252, 211, 77, ${alpha})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 2 + 2 * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = 'white';
      ctx.save();
      ctx.translate(player.x + paddleWidth / 2, player.y + paddleHeight / 2);
      ctx.rotate(player.rot);
      ctx.scale(player.widthScale, player.scale);
      ctx.shadowColor = 'rgba(96, 165, 250, 0.7)';
      ctx.shadowBlur = player.glow + 10;
      ctx.fillRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight);
      ctx.restore();

      if (mode !== 'practice') {
        ctx.save();
        ctx.translate(opponent.x + paddleWidth / 2, opponent.y + paddleHeight / 2);
        ctx.rotate(opponent.rot);
        ctx.scale(opponent.widthScale, opponent.scale);
        ctx.shadowColor = 'rgba(250, 204, 21, 0.7)';
        ctx.shadowBlur = opponent.glow + 10;
        ctx.fillRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight);
        ctx.restore();
      } else {
        ctx.fillRect(opponent.x, 0, paddleWidth, height);
      }

      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.scale(ball.scale, ball.scale);
      ctx.beginPath();
      ctx.arc(0, 0, ball.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const applyInputs = (pad, control, dt) => {
      const accel = 2000; // acceleration in px/s^2
      const maxSpeed = 400; // max paddle speed
      const friction = 2000; // deceleration when no input
      const prevY = pad.y;

      if (control.touchY !== null) {
        pad.y = control.touchY - paddleHeight / 2;
        pad.vy = (pad.y - prevY) / dt;
      } else {
        if (control.up) pad.vy -= accel * dt;
        if (control.down) pad.vy += accel * dt;

        if (!control.up && !control.down) {
          if (pad.vy > 0) pad.vy = Math.max(0, pad.vy - friction * dt);
          else if (pad.vy < 0) pad.vy = Math.min(0, pad.vy + friction * dt);
        }

        if (pad.vy > maxSpeed) pad.vy = maxSpeed;
        if (pad.vy < -maxSpeed) pad.vy = -maxSpeed;

        pad.y += pad.vy * dt;
      }

      if (pad.y < 0) {
        pad.y = 0;
        pad.vy = 0;
      } else if (pad.y > height - paddleHeight) {
        pad.y = height - paddleHeight;
        pad.vy = 0;
      }
    };

    const update = (dt) => {
      frame += 1;
      frameRef.current = frame;

      // decay impact scaling and rotation
      const decay = (obj) => {
        if (obj.scale !== undefined) obj.scale += (1 - obj.scale) * 10 * dt;
        if (obj.widthScale !== undefined)
          obj.widthScale += (1 - obj.widthScale) * 10 * dt;
        if (obj.rot !== undefined) obj.rot += -obj.rot * 10 * dt;
        if (obj.glow !== undefined) obj.glow += -obj.glow * 10 * dt;
      };
      decay(player);
      decay(opponent);
      decay(ball);

      // local player
      const p1 = {
        up: controls.current.keys['ArrowUp'],
        down: controls.current.keys['ArrowDown'],
        touchY: controls.current.touchY ?? null,
      };
      applyInputs(player, p1, dt);
      if (!prefersReducedMotion) {
        paddleTrail.player.push({ x: player.x, y: player.y });
        while (paddleTrail.player.length > MAX_PADDLE_TRAIL) paddleTrail.player.shift();
      }

      // opponent (AI, local or remote)
      if (mode === 'cpu') {
        const error = ball.y - (opponent.y + paddleHeight / 2);
        // Map difficulty string to 0-1 scale
        const diffMap = { easy: 0.3, normal: 0.6, hard: 1 };
        const diff = diffMap[difficulty] ?? 0.6;
        // Non-linear difficulty curve for smoother progression
        const gain = 5 + diff * diff * 45; // 5-50
        opponent.vy = error * gain;
        const max = 200 + diff * 200; // 200-400
        if (opponent.vy > max) opponent.vy = max;
        if (opponent.vy < -max) opponent.vy = -max;
        opponent.y += opponent.vy * dt;
        if (opponent.y < 0) opponent.y = 0;
        if (opponent.y > height - paddleHeight) opponent.y = height - paddleHeight;
        if (frame % 12 === 0) {
          const closeness = Math.abs(error);
          if (closeness < 15) setAiIndicator('AI: Locked on');
          else if (closeness < 40) setAiIndicator('AI: Dialing in');
          else setAiIndicator('AI: Scanning court');
        }
      } else if (mode === 'local') {
        const p2 = {
          up: controls.current.keys['w'] || controls.current.keys['W'],
          down: controls.current.keys['s'] || controls.current.keys['S'],
          touchY: controls.current.touchY2 ?? null,
        };
        applyInputs(opponent, p2, dt);
        if (frame % 20 === 0) setAiIndicator('Local Versus');
      } else if (mode === 'online') {
        applyInputs(opponent, remoteKeys, dt);
        if (frame % 20 === 0)
          setAiIndicator(connected ? 'Online Link Active' : 'Waiting for peer');
      } else if (frame % 30 === 0) {
        setAiIndicator('Solo Drill');
      }
      if (!prefersReducedMotion) {
        paddleTrail.opponent.push({ x: opponent.x, y: opponent.y });
        while (paddleTrail.opponent.length > MAX_PADDLE_TRAIL)
          paddleTrail.opponent.shift();
      }

      // move ball
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (!prefersReducedMotion) {
        ballTrail.push({ x: ball.x, y: ball.y });
        const speedRatio = Math.min(
          1,
          Math.hypot(ball.vx, ball.vy) / (MAX_BALL_SPEED * speedRef.current)
        );
        const maxTrail = Math.round(
          MIN_TRAIL + (MAX_TRAIL - MIN_TRAIL) * speedRatio
        );
        while (ballTrail.length > maxTrail) ballTrail.shift();
      }

      // wall collisions
      if (ball.y < ball.size) {
        ball.y = ball.size;
        ball.vy *= -1;
        playSound(300);
      }
      if (ball.y > height - ball.size) {
        ball.y = height - ball.size;
        ball.vy *= -1;
        playSound(300);
      }

      if (mode === 'practice' && ball.vx > 0 && ball.x + ball.size > opponent.x) {
        ball.x = opponent.x - ball.size;
        ball.vx *= -1;
        setRally((r) => r + 1);
        playSound(440);
        if (!prefersReducedMotion) {
          sparks.push({
            x: ball.x,
            y: ball.y,
            vx: -ball.vx * 0.02,
            vy: (Math.random() - 0.5) * 160,
            life: 0.25,
            maxLife: 0.3,
          });
        }
      }

      const spawnSparks = (dir) => {
        if (prefersReducedMotion) return;
        for (let i = 0; i < SPARK_POOL; i += 1) {
          sparks.push({
            x: ball.x,
            y: ball.y,
            vx: dir * (80 + Math.random() * 140) * (Math.random() > 0.5 ? 1 : -1),
            vy: (Math.random() - 0.5) * 220,
            life: 0.25 + Math.random() * 0.25,
            maxLife: 0.45,
          });
        }
      };

      const paddleCollision = (pad, dir) => {
        setRally((r) => r + 1);
        const { spin, relative } = getBallSpin(
          ball.y,
          pad.y,
          paddleHeight,
          pad.vy,
          pongSpin,
        );
        ball.vx = Math.abs(ball.vx) * dir;
        ball.vy += spin;
        if (!prefersReducedMotion) {
          pad.scale = 1.2;
          pad.widthScale = 0.8;
          pad.rot = pongSpin ? relative * 0.3 : 0;
          ball.scale = 1.2;
        }
        const impact = Math.hypot(ball.vx, ball.vy);
        pad.glow = (impact / (MAX_BALL_SPEED * speedRef.current)) * 20;
        const speed = impact * HIT_SPEEDUP * speedRef.current;
        const ratio = Math.min(speed, MAX_BALL_SPEED * speedRef.current) / impact;
        ball.vx *= ratio;
        ball.vy *= ratio;
        playSound(440);
        spawnSparks(dir);
      };

      if (
        ball.vx < 0 &&
        ball.x - ball.size < player.x + paddleWidth &&
        ball.y > player.y &&
        ball.y < player.y + paddleHeight
      ) {
        ball.x = player.x + paddleWidth + ball.size;
        paddleCollision(player, 1);
      }

      if (
        mode !== 'practice' &&
        ball.vx > 0 &&
        ball.x + ball.size > opponent.x &&
        ball.y > opponent.y &&
        ball.y < opponent.y + paddleHeight
      ) {
        ball.x = opponent.x - ball.size;
        paddleCollision(opponent, -1);
      }

      // scoring
      if (mode === 'practice') {
        if (ball.x < 0) {
          setRally(0);
          resetBall(1);
          playSound(200);
        }
      } else {
        if (ball.x < 0) {
          setRally(0);
          oppScore += 1;
          setScores({ player: playerScore, opponent: oppScore });
          resetBall(1);
          playSound(200);
        } else if (ball.x > width) {
          setRally(0);
          playerScore += 1;
          setScores({ player: playerScore, opponent: oppScore });
          resetBall(-1);
          playSound(200);
        }

        // check game end
        if (playerScore >= WIN_POINTS || oppScore >= WIN_POINTS) {
          const playerWon = playerScore > oppScore;
          setMatch((prev) => {
            const next = { ...prev };
            if (playerWon) next.player += 1;
            else next.opponent += 1;
            if (next.player >= 2 || next.opponent >= 2) {
              const winner = playerWon ? 'Player' : 'Opponent';
              setMatchWinner(winner);
              setHistory((h) => {
                const newHist = [...h, { player: next.player, opponent: next.opponent, winner }];
                try {
                  localStorage.setItem('pongHistory', JSON.stringify(newHist));
                } catch {}
                return newHist;
              });
            }
            return next;
          });
          playerScore = 0;
          oppScore = 0;
          setScores({ player: 0, opponent: 0 });
          player.y = height / 2 - paddleHeight / 2;
          opponent.y = height / 2 - paddleHeight / 2;
          player.rot = 0;
          opponent.rot = 0;
          resetBall(playerWon ? -1 : 1);
        }
      }

      if (!prefersReducedMotion) {
        for (let i = sparks.length - 1; i >= 0; i -= 1) {
          const s = sparks[i];
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life -= dt;
          if (s.life <= 0) {
            sparks.splice(i, 1);
          }
        }
      } else if (sparks.length) {
        sparks.length = 0;
      }

      saveState();
    };

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // clamp big jumps
      lastTime = now;
      if (!pausedRef.current && !matchWinner) {
        update(dt);
      }
      draw();
      animationId = requestAnimationFrame(loop);
    };

    const handleMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'input') {
          const { frame: f, up, down } = msg;
          remoteKeys.up = up;
          remoteKeys.down = down;
          if (f < frame) {
            // rollback to remote frame and resimulate
            if (loadState(f)) {
              for (let i = f; i < frame; i += 1) {
                update(FRAME_TIME / 1000);
              }
            }
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    if (mode === 'online' && channelRef.current) {
      channelRef.current.onmessage = handleMessage;
    }

    resetBall();
    lastTime = performance.now();
    loop();

    return () => {
      cancelAnimationFrame(animationId);
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else if (motionQuery.removeListener) {
        motionQuery.removeListener(handleMotionChange);
      }
    };
    }, [difficulty, mode, connected, matchWinner, controls, canvasRef, playSound, pongSpin]);

  const reset = useCallback(() => {
    if (resetRef.current) resetRef.current();
  }, []);

  // --- WebRTC helpers ---
  const createConnection = useCallback(async () => {
    const pc = new RTCPeerConnection();
    const channel = pc.createDataChannel('pong');
    channel.onopen = () => setConnected(true);
    // handle messages early to avoid missing any before effect runs
    channel.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg && msg.type === 'input') {
          // no-op here, the effect will set the definitive handler
        }
      } catch {}
    };
    channelRef.current = channel;
    peerRef.current = pc;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    pc.onicecandidate = (e) => {
      if (!e.candidate) setOfferSDP(JSON.stringify(pc.localDescription));
    };
  }, []);

  const acceptAnswer = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc) return;
    try {
      const desc = JSON.parse(answerSDP);
      await pc.setRemoteDescription(desc);
    } catch {
      // ignore invalid SDP
    }
  }, [answerSDP]);

  const joinConnection = useCallback(async () => {
    const pc = new RTCPeerConnection();
    pc.ondatachannel = (e) => {
      const channel = e.channel;
      channel.onopen = () => setConnected(true);
      // set handler so we do not miss early messages
      channel.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg && msg.type === 'input') {
            // no-op, effect will overwrite handler
          }
        } catch {}
      };
      channelRef.current = channel;
    };
    peerRef.current = pc;
    try {
      const desc = JSON.parse(offerSDP);
      await pc.setRemoteDescription(desc);
    } catch {
      // ignore invalid SDP
      return;
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    pc.onicecandidate = (e) => {
      if (!e.candidate) setAnswerSDP(JSON.stringify(pc.localDescription));
    };
  }, [offerSDP]);

  const playerLabel = mode === 'local' ? 'P1' : 'Player';
  const opponentLabel = mode === 'local' ? 'P2' : mode === 'practice' ? 'Trainer' : 'Opponent';
  const scoreboardHeadline =
    mode === 'practice'
      ? `Rally ${rally}`
      : `${playerLabel} ${scores.player} • ${opponentLabel} ${scores.opponent}`;
  const setHeadline =
    mode === 'practice'
      ? `Best Rally ${highScore}`
      : `Matches ${match.player} – ${match.opponent}`;
  const modeHeadline =
    {
      cpu: 'CPU Match',
      local: 'Local Versus',
      online: connected ? 'Online Match' : 'Online Lobby',
      practice: 'Solo Practice',
    }[mode] || 'Pong';

  const controlNotes = [
    {
      label: 'Keyboard',
      value: 'Arrow keys move Player 1 • W/S move Player 2',
    },
    {
      label: 'Touch',
      value: 'Drag anywhere on each side to steer a paddle',
    },
    {
      label: 'Gamepad',
      value: 'Use the left stick or D-Pad on the first controller',
    },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
        <div className="relative w-full">
          <div className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 shadow-2xl backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/5 via-transparent to-slate-50/10" />
            <div className="relative aspect-[3/2] w-full">
              <canvas
                ref={canvasRef}
                className="h-full w-full rounded-[2rem] bg-transparent touch-none"
                role="img"
                aria-label="Futuristic neon pong arena"
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs sm:text-sm">
                  <div className="flex flex-col gap-1 rounded-full bg-slate-950/60 px-4 py-2 shadow-lg backdrop-blur">
                    <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">
                      {modeHeadline}
                    </span>
                    <span aria-live="polite" role="status" className="text-base sm:text-lg">
                      {scoreboardHeadline}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 rounded-full bg-slate-950/60 px-4 py-2 text-right shadow-lg backdrop-blur">
                    <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-300">
                      Momentum
                    </span>
                    <span className="text-base sm:text-lg">{setHeadline}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[0.65rem] sm:text-xs">
                  <div className="rounded-full bg-sky-400/20 px-3 py-1 font-semibold text-sky-100 shadow">
                    {aiIndicator}
                  </div>
                  <div className="rounded-full bg-amber-400/10 px-3 py-1 text-amber-100">
                    Rally {rally}
                    {mode === 'practice' ? ` • Best ${highScore}` : ''}
                  </div>
                  <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-100">
                    Input: {lastInput}
                    {gamepadConnected ? ' 🎮' : ''}
                  </div>
                </div>
              </div>
              {matchWinner && (
                <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-full bg-indigo-500/20 p-4 text-center text-lg font-semibold text-indigo-100 shadow-2xl backdrop-blur">
                  {matchWinner} takes the set!
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <section className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-lg backdrop-blur">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Modes
            </h2>
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  mode === 'cpu'
                    ? 'bg-sky-500 text-slate-900'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
                onClick={() => setMode('cpu')}
              >
                vs CPU
              </button>
              <button
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  mode === 'local'
                    ? 'bg-sky-500 text-slate-900'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
                onClick={() => setMode('local')}
              >
                2 Players
              </button>
              <button
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  mode === 'online'
                    ? 'bg-sky-500 text-slate-900'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
                onClick={() => setMode('online')}
              >
                Online
              </button>
              <button
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  mode === 'practice'
                    ? 'bg-sky-500 text-slate-900'
                    : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
                onClick={() => setMode('practice')}
              >
                Practice
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-lg backdrop-blur">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Match Tuning
            </h2>
            {mode === 'practice' ? (
              <label className="flex flex-col gap-2 text-slate-200">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  Speed {speedMultiplier.toFixed(1)}x
                </span>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.1"
                  value={speedMultiplier}
                  onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                  aria-label="Speed multiplier"
                  className="accent-sky-400"
                />
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-slate-200">
                <span className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  AI Difficulty
                </span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  aria-label="AI difficulty"
                  className="rounded-full bg-slate-800 px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            )}
          </section>

          <section className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-lg backdrop-blur sm:col-span-2">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Audio & Focus
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  paused ? 'bg-rose-500 text-slate-900' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? 'Resume Play' : 'Pause Match'}
              </button>
              <button
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  sound ? 'bg-lime-400 text-slate-900' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
                onClick={() => setSound((s) => !s)}
              >
                Sound {sound ? 'On' : 'Muted'}
              </button>
              <button
                className={`rounded-full px-4 py-2 font-semibold transition ${
                  ambience ? 'bg-purple-400 text-slate-900' : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                }`}
                onClick={() => setAmbience((a) => !a)}
                disabled={!sound}
              >
                Crowd {ambience ? 'On' : 'Off'}
              </button>
              <button
                className="rounded-full bg-slate-800 px-4 py-2 font-semibold text-slate-100 transition hover:bg-slate-700"
                onClick={reset}
              >
                Reset Match
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Crowd ambience is synthesised locally and respects your master sound toggle. Turn sound off to silence the arena instantly.
            </p>
          </section>

          {mode === 'online' && !connected && (
            <section className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-lg backdrop-blur sm:col-span-2">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                Online Lobby
              </h2>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-sky-500 px-4 py-2 font-semibold text-slate-900 shadow transition hover:bg-sky-400"
                    onClick={createConnection}
                  >
                    Create Offer
                  </button>
                  <button
                    className="rounded-full bg-slate-800 px-4 py-2 font-semibold text-slate-100 transition hover:bg-slate-700"
                    onClick={offerSDP ? acceptAnswer : joinConnection}
                  >
                    {offerSDP ? 'Set Remote Answer' : 'Join with Offer'}
                  </button>
                </div>
                {offerSDP && (
                  <label className="flex flex-col gap-1 text-xs text-slate-300">
                    <span>Share this offer with your opponent</span>
                    <textarea
                      className="h-24 w-full rounded-lg bg-slate-950/80 p-2 text-slate-100"
                      value={offerSDP}
                      readOnly
                      aria-label="Generated offer SDP"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1 text-xs text-slate-300">
                  <span>Paste their response to connect</span>
                  <textarea
                    className="h-24 w-full rounded-lg bg-slate-950/80 p-2 text-slate-100"
                    placeholder="Paste remote SDP"
                    value={answerSDP}
                    onChange={(e) => setAnswerSDP(e.target.value)}
                    aria-label="Remote SDP"
                  />
                </label>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-lg backdrop-blur sm:col-span-2">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
              Controls & Accessibility
            </h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {controlNotes.map((note) => (
                <div
                  key={note.label}
                  className="rounded-xl bg-slate-800/80 p-3 text-xs text-slate-200 shadow"
                >
                  <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">
                    {note.label}
                  </p>
                  <p className="mt-1 leading-relaxed">{note.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Gamepad support follows the system default mapping. The active input method is tracked automatically for assistive technologies and displays above the arena.
            </p>
          </section>

          {history.length > 0 && (
            <section className="rounded-2xl border border-white/5 bg-slate-900/70 p-4 shadow-lg backdrop-blur sm:col-span-2">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
                Recent Sets
              </h2>
              <ul className="max-h-36 space-y-1 overflow-y-auto text-xs text-slate-200">
                {history.map((h, i) => (
                  <li key={i} className="rounded-lg bg-slate-800/70 px-3 py-1">
                    {h.player} – {h.opponent} · {h.winner}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

const Pong = () => (
  <SettingsProvider>
    <PongInner />
  </SettingsProvider>
);

export default Pong;
