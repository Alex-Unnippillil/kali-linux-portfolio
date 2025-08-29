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
const MIN_TRAIL = 1;
const MAX_TRAIL = 2;

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
  }, []);

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
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        ctx.fillStyle = 'white';
        for (let i = 0; i < ballTrail.length; i += 1) {
          const t = ballTrail[i];
          const progress = (i + 1) / ballTrail.length;
          ctx.globalAlpha = progress * 0.3;
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.size * progress, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = 'white';
      ctx.save();
      ctx.translate(player.x + paddleWidth / 2, player.y + paddleHeight / 2);
      ctx.rotate(player.rot);
      ctx.scale(player.widthScale, player.scale);
      ctx.shadowColor = 'white';
      ctx.shadowBlur = player.glow;
      ctx.fillRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight);
      ctx.restore();

      if (mode !== 'practice') {
        ctx.save();
        ctx.translate(opponent.x + paddleWidth / 2, opponent.y + paddleHeight / 2);
        ctx.rotate(opponent.rot);
        ctx.scale(opponent.widthScale, opponent.scale);
        ctx.shadowColor = 'white';
        ctx.shadowBlur = opponent.glow;
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
      } else if (mode === 'local') {
        const p2 = {
          up: controls.current.keys['w'] || controls.current.keys['W'],
          down: controls.current.keys['s'] || controls.current.keys['S'],
          touchY: controls.current.touchY2 ?? null,
        };
        applyInputs(opponent, p2, dt);
      } else if (mode === 'online') {
        applyInputs(opponent, remoteKeys, dt);
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
      }

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
    }, [difficulty, mode, connected, matchWinner, controls, canvasRef, playSound]);

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

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
      <canvas
        ref={canvasRef}
        className="bg-black w-full h-full touch-none"
      />
      {mode === 'practice' ? (
        <div className="mt-2 font-mono text-center" aria-live="polite" role="status">
          Rally: {rally} (Best: {highScore})
        </div>
      ) : (
        <>
          <div className="mt-2 font-mono text-center" aria-live="polite" role="status">
            {mode === 'local'
              ? `P1: ${scores.player} | P2: ${scores.opponent}`
              : `Player: ${scores.player} | Opponent: ${scores.opponent}`}
          </div>
          <div className="mt-1">Games: {match.player} | {match.opponent}</div>
          {matchWinner && (
            <div className="mt-1 text-lg">Winner: {matchWinner}</div>
          )}
        </>
      )}

      {mode === 'practice' ? (
        <div className="mt-2 flex items-center space-x-2">
          <label>Speed: {speedMultiplier.toFixed(1)}x</label>
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.1"
            value={speedMultiplier}
            onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
            aria-label="Speed multiplier"
          />
        </div>
      ) : mode === 'cpu' ? (
        <div className="mt-2 flex items-center space-x-2">
          <label>AI Difficulty: {difficulty}</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            aria-label="AI difficulty"
            className="text-black p-1"
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      ) : null}

      <div className="mt-2 space-x-2">
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setMode('cpu')}
        >
          vs CPU
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setMode('local')}
        >
          2 Players
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setMode('online')}
        >
          Online
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setMode('practice')}
        >
          Practice
        </button>
      </div>

      {mode === 'online' && !connected && (
        <div className="mt-2 flex flex-col items-center space-y-2 w-full px-4">
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={createConnection}
          >
            Create
          </button>
          {offerSDP && (
            <textarea
              className="w-full text-black"
              value={offerSDP}
              readOnly
              aria-label="Generated offer SDP"
            />
          )}
          <textarea
            className="w-full text-black"
            placeholder="Paste remote SDP"
            value={answerSDP}
            onChange={(e) => setAnswerSDP(e.target.value)}
            aria-label="Remote SDP"
          />
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={offerSDP ? acceptAnswer : joinConnection}
          >
            {offerSDP ? 'Set Answer' : 'Join'}
          </button>
        </div>
      )}

      <div className="mt-2 space-x-2">
        <button
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={() => setSound((s) => !s)}
        >
          Sound: {sound ? 'On' : 'Off'}
        </button>
        <button
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          onClick={reset}
        >
          Reset
        </button>
      </div>

      {history.length > 0 && (
        <div className="mt-2 max-h-24 overflow-y-auto text-sm">
          {history.map((h, i) => (
            <div key={i}>
              {h.player} - {h.opponent} ({h.winner})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Pong = () => (
  <SettingsProvider>
    <PongInner />
  </SettingsProvider>
);

export default Pong;
