import React, { useRef, useEffect, useState, useCallback } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import useGameControls from './useGameControls';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings as useGlobalSettings } from '../../hooks/useSettings';
import { SettingsProvider, useSettings as useGameSettings } from './GameSettingsContext';
import { shouldHandleGameKey } from '../../utils/gameInput';
import {
  createInitialState,
  DEFAULT_CONFIG,
  resetBall as resetEngine,
  step as stepEngine,
} from '../../games/pong/engine';

// Basic timing constants so the simulation is consistent across refresh rates
const FRAME_TIME = 1000 / 60; // ideal frame time in ms
const WIN_POINTS = 5; // points to win a game

// Dynamic trail length based on ball speed (1-2 frame trail)
const MIN_TRAIL = 1;
const MAX_TRAIL = 2;

// Pong component with spin, adjustable AI and experimental WebRTC multiplayer
const WIDTH = 600;
const HEIGHT = 400;

const PongInner = ({ windowMeta }) => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const resetRef = useRef(null);
  const rewindRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const frameRef = useRef(0);
  const engineStateRef = useRef(null);
  const stateHistoryRef = useRef([]);
  const rallyRef = useRef(0);

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
  const [canRewind, setCanRewind] = useState(false);
  const { pongSpin } = useGlobalSettings();
  const [highScore, setHighScore] = usePersistentState(
    'pong_highscore',
    0,
    (v) => typeof v === 'number',
  );
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [matchHistory, setMatchHistory] = useState(() => {
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
    rallyRef.current = rally;
  }, [rally]);

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
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const config = {
      ...DEFAULT_CONFIG,
      WIDTH,
      HEIGHT,
      PRACTICE_SPEED_MULTIPLIER: speedMultiplier,
      spinEnabled: pongSpin,
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

    const cloneState = (state) => ({
      paddles: {
        left: { ...state.paddles.left },
        right: { ...state.paddles.right },
      },
      ball: { ...state.ball },
      score: { ...state.score },
      rally: state.rally,
      mode: state.mode,
      ai: { ...state.ai },
      rngSeed: state.rngSeed,
    });

    engineStateRef.current = createInitialState(config, 1, mode, difficulty);
    frameRef.current = 0;
    setScores({ player: 0, opponent: 0 });
    setRally(0);

    const remoteKeys = { up: false, down: false, touchY: null };
    const stateHistory = stateHistoryRef.current;
    stateHistory.length = 0;
    const rewindFrames = Math.round(2 * 60);
    let canRewindNow = false;
    let animationId;
    let lastTime = performance.now();
    let accumulator = 0;
    let playerScore = 0;
    let oppScore = 0;

    const resetPositions = () => {
      engineStateRef.current.paddles.left.y = config.HEIGHT / 2 - config.PADDLE_HEIGHT / 2;
      engineStateRef.current.paddles.left.vy = 0;
      engineStateRef.current.paddles.right.y = config.HEIGHT / 2 - config.PADDLE_HEIGHT / 2;
      engineStateRef.current.paddles.right.vy = 0;
    };

    resetRef.current = () => {
      engineStateRef.current = createInitialState(config, 1, mode, difficulty);
      frameRef.current = 0;
      playerScore = 0;
      oppScore = 0;
      setScores({ player: 0, opponent: 0 });
      setMatch({ player: 0, opponent: 0 });
      setMatchWinner(null);
      setPaused(false);
      pausedRef.current = false;
      setRally(0);
      rallyRef.current = 0;
      stateHistory.length = 0;
      setCanRewind(false);
    };

    const saveState = () => {
      stateHistory[frameRef.current % 240] = {
        frame: frameRef.current,
        state: cloneState(engineStateRef.current),
      };
    };

    const loadState = (frame) => {
      const snap = stateHistory[frame % 240];
      if (!snap || snap.frame !== frame) return false;
      engineStateRef.current = cloneState(snap.state);
      return true;
    };

    const getCanRewind = (frames = rewindFrames) => {
      const target = Math.max(0, frameRef.current - frames);
      if (frameRef.current < frames) return false;
      const snap = stateHistory[target % 240];
      return Boolean(snap && snap.frame === target);
    };

    rewindRef.current = (seconds = 2) => {
      const frames = Math.round(seconds * 60);
      if (frameRef.current < frames) return false;
      const target = Math.max(0, frameRef.current - frames);
      if (!loadState(target)) return false;
      frameRef.current = target;
      ballTrail.length = 0;
      setRally(engineStateRef.current.rally);
      rallyRef.current = engineStateRef.current.rally;
      const nextCanRewind = getCanRewind(frames);
      canRewindNow = nextCanRewind;
      setCanRewind(nextCanRewind);
      return true;
    };

    const draw = () => {
      const state = engineStateRef.current;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, config.WIDTH, config.HEIGHT);

      if (!prefersReducedMotion) {
        ctx.fillStyle = 'white';
        for (let i = 0; i < ballTrail.length; i += 1) {
          const t = ballTrail[i];
          const progress = (i + 1) / ballTrail.length;
          ctx.globalAlpha = progress * 0.3;
          ctx.beginPath();
          ctx.arc(t.x, t.y, config.BALL_SIZE * progress, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(config.PADDLE_WIDTH, state.paddles.left.y, config.PADDLE_WIDTH, config.PADDLE_HEIGHT);

      if (mode !== 'practice') {
        ctx.fillRect(
          config.WIDTH - config.PADDLE_WIDTH * 2,
          state.paddles.right.y,
          config.PADDLE_WIDTH,
          config.PADDLE_HEIGHT,
        );
      } else {
        ctx.fillRect(config.WIDTH - config.PADDLE_WIDTH, 0, config.PADDLE_WIDTH, config.HEIGHT);
      }

      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, config.BALL_SIZE, 0, Math.PI * 2);
      ctx.fill();
    };

    const handleEvents = (events) => {
      const state = engineStateRef.current;
      events.forEach((ev) => {
        if (ev.type === 'hit') {
          setRally(state.rally);
          playSound(440);
        } else if (ev.type === 'wall') {
          playSound(300);
        } else if (ev.type === 'score') {
          setRally(0);
          playSound(200);
          playerScore = state.score.left;
          oppScore = state.score.right;
          setScores({ player: playerScore, opponent: oppScore });
          if (mode !== 'practice' && (playerScore >= WIN_POINTS || oppScore >= WIN_POINTS)) {
            const playerWon = playerScore > oppScore;
            setMatch((prev) => {
              const next = { ...prev };
              if (playerWon) next.player += 1;
              else next.opponent += 1;
              if (next.player >= 2 || next.opponent >= 2) {
                const winner = playerWon ? 'Player' : 'Opponent';
                setMatchWinner(winner);
                setMatchHistory((h) => {
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
            engineStateRef.current.score = { left: 0, right: 0 };
            setScores({ player: 0, opponent: 0 });
            resetPositions();
            resetEngine(engineStateRef.current, playerWon ? -1 : 1, config);
          }
        }
      });

      if (state.rally !== rallyRef.current) {
        setRally(state.rally);
        rallyRef.current = state.rally;
      }
    };

    const getInputs = () => {
      const left = {
        up: controls.current.keys['ArrowUp'],
        down: controls.current.keys['ArrowDown'],
        touchY: controls.current.touchY ?? null,
      };

      if (mode === 'local') {
        return {
          left,
          right: {
            up: controls.current.keys['w'] || controls.current.keys['W'],
            down: controls.current.keys['s'] || controls.current.keys['S'],
            touchY: controls.current.touchY2 ?? null,
          },
        };
      }

      if (mode === 'online') {
        return { left, right: remoteKeys };
      }

      return { left, right: {} };
    };

    const stepSim = (dt) => {
      frameRef.current += 1;
      const events = stepEngine(engineStateRef.current, getInputs(), dt, config);
      if (!prefersReducedMotion) {
        ballTrail.push({ x: engineStateRef.current.ball.x, y: engineStateRef.current.ball.y });
        const speedRatio = Math.min(
          1,
          Math.hypot(engineStateRef.current.ball.vx, engineStateRef.current.ball.vy) /
            (config.MAX_BALL_SPEED * speedMultiplier),
        );
        const maxTrail = Math.round(MIN_TRAIL + (MAX_TRAIL - MIN_TRAIL) * speedRatio);
        while (ballTrail.length > maxTrail) ballTrail.shift();
      }
      saveState();
      const nextCanRewind = getCanRewind();
      if (nextCanRewind !== canRewindNow) {
        canRewindNow = nextCanRewind;
        setCanRewind(nextCanRewind);
      }
      handleEvents(events);
    };

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      if (!pausedRef.current && !matchWinner) {
        accumulator += dt;
        const fixedDt = FRAME_TIME / 1000;
        accumulator = Math.min(accumulator, 0.25);
        while (accumulator >= fixedDt) {
          stepSim(fixedDt);
          accumulator -= fixedDt;
        }
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
          if (f < frameRef.current) {
            if (loadState(f)) {
              const targetFrame = frameRef.current;
              frameRef.current = f;
              for (let i = f; i < targetFrame; i += 1) {
                stepSim(FRAME_TIME / 1000);
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

    resetEngine(engineStateRef.current, undefined, config);
    saveState();
    lastTime = performance.now();
    loop();

    return () => {
      cancelAnimationFrame(animationId);
      rewindRef.current = null;
      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      } else if (motionQuery.removeListener) {
        motionQuery.removeListener(handleMotionChange);
      }
    };
  }, [
    difficulty,
    mode,
    connected,
    matchWinner,
    controls,
    canvasRef,
    playSound,
    pongSpin,
    speedMultiplier,
  ]);

  useEffect(() => {
    if (mode !== 'practice') return undefined;
    const handleRewind = (e) => {
      if (!shouldHandleGameKey(e, { isFocused: windowMeta?.isFocused ?? true })) return;
      if (e.repeat) return;
      if (e.key.toLowerCase() !== 'r') return;
      rewindRef.current?.(2);
    };
    window.addEventListener('keydown', handleRewind);
    return () => {
      window.removeEventListener('keydown', handleRewind);
    };
  }, [mode, windowMeta?.isFocused]);

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
        aria-label="Pong game board"
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
          <div className="mt-1">Rally: {rally}</div>
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
        {mode === 'practice' && (
          <button
            className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => rewindRef.current?.(2)}
            disabled={!canRewind}
            aria-label="Rewind 2 seconds"
          >
            Rewind 2s
          </button>
        )}
      </div>

      {matchHistory.length > 0 && (
        <div className="mt-2 max-h-24 overflow-y-auto text-sm">
          {matchHistory.map((h, i) => (
            <div key={i}>
              {h.player} - {h.opponent} ({h.winner})
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Pong = ({ windowMeta }) => (
  <SettingsProvider>
    <PongInner windowMeta={windowMeta} />
  </SettingsProvider>
);

export default Pong;
