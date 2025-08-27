import React, { useRef, useEffect, useState } from 'react';
import useCanvasResize from '../../hooks/useCanvasResize';
import useGameControls from './useGameControls';

// Basic timing constants so the simulation is consistent across refresh rates
const FRAME_TIME = 1000 / 60; // ideal frame time in ms
const WIN_POINTS = 5; // points to win a game
const SPEEDUP_RATE = 50; // px/s increase for progressive speed
const MAX_BALL_SPEED = 600; // maximum ball speed in px/s

// Pong component with spin, adjustable AI and experimental WebRTC multiplayer
const WIDTH = 600;
const HEIGHT = 400;

const Pong = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const resetRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);
  const frameRef = useRef(0);

  const [scores, setScores] = useState({ player: 0, opponent: 0 });
  const [difficulty, setDifficulty] = useState(5); // 1-10 difficulty scale
  const [match, setMatch] = useState({ player: 0, opponent: 0 });
  const [matchWinner, setMatchWinner] = useState(null);
  const [mode, setMode] = useState('cpu'); // 'cpu' or 'online'
  const [offerSDP, setOfferSDP] = useState('');
  const [answerSDP, setAnswerSDP] = useState('');
  const [connected, setConnected] = useState(false);

  const controls = useGameControls(canvasRef, (state) => {
    if (mode === 'online' && channelRef.current) {
      channelRef.current.send(
        JSON.stringify({
          type: 'input',
          frame: frameRef.current + 1,
          up: state.up,
          down: state.down,
        })
      );
    }
  });

  // Main game effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = WIDTH;
    const height = HEIGHT;

    const style = getComputedStyle(canvas);
    const trailLength =
      parseInt(style.getPropertyValue('--pong-trail-length'), 10) || 10;
    const trailOpacity =
      parseFloat(style.getPropertyValue('--pong-trail-opacity')) || 0.2;

    const paddleHeight = 80;
    const paddleWidth = 10;

    const player = {
      x: 10,
      y: height / 2 - paddleHeight / 2,
      vy: 0,
      scale: 1,
      rot: 0,
    };
    const opponent = {
      x: width - paddleWidth - 10,
      y: height / 2 - paddleHeight / 2,
      vy: 0,
      scale: 1,
      rot: 0,
    };
    const ball = {
      x: width / 2,
      y: height / 2,
      vx: 200,
      vy: 120,
      size: 8,
      scale: 1,
    };

    const trail = [];

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
      ball.vx = 200 * dir;
      // ensure vertical speed has some variance but avoids near-zero values
      let vy = rand() * 40 + 40; // 40-80
      if (rand() > 0.5) vy *= -1;
      ball.vy = vy;
      trail.length = 0;
    };

    resetRef.current = () => {
      playerScore = 0;
      oppScore = 0;
      setScores({ player: 0, opponent: 0 });
      setMatch({ player: 0, opponent: 0 });
      setMatchWinner(null);
      player.y = height / 2 - paddleHeight / 2;
      opponent.y = height / 2 - paddleHeight / 2;
      player.rot = 0;
      opponent.rot = 0;

      resetBall();
    };

    const draw = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'white';
      for (let i = 0; i < trail.length; i += 1) {
        const t = trail[i];
        const alpha = (i + 1) / trail.length * trailOpacity;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(player.x + paddleWidth / 2, player.y + paddleHeight / 2);
      ctx.rotate(player.rot);
      ctx.scale(1, player.scale);
      ctx.fillRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight);
      ctx.restore();

      ctx.save();
      ctx.translate(opponent.x + paddleWidth / 2, opponent.y + paddleHeight / 2);
      ctx.rotate(opponent.rot);
      ctx.scale(1, opponent.scale);
      ctx.fillRect(-paddleWidth / 2, -paddleHeight / 2, paddleWidth, paddleHeight);
      ctx.restore();

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

    const cpuHistory = [];

    const update = (dt) => {
      frame += 1;
      frameRef.current = frame;

      // progressive speedup with capped delta
      const cappedDt = Math.min(dt, 0.02);
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed < MAX_BALL_SPEED) {
        const nextSpeed = Math.min(speed + SPEEDUP_RATE * cappedDt, MAX_BALL_SPEED);
        const ratio = nextSpeed / (speed || 1);
        ball.vx *= ratio;
        ball.vy *= ratio;
      }

      // decay impact scaling and rotation
      const decay = (obj) => {
        obj.scale += (1 - obj.scale) * 10 * dt;
        if (obj.rot !== undefined) obj.rot += -obj.rot * 10 * dt;
      };
      decay(player);
      decay(opponent);
      decay(ball);

      // local player
      applyInputs(player, controls.current, dt);

      // opponent (AI or remote)
      if (mode === 'cpu') {
        // adjustable difficulty AI using reaction delay and speed
        cpuHistory.push(ball.y);
        const diff = difficulty / 10;
        const reactionMs = 400 - diff * 350;
        const aiSpeed = 200 + diff * 200;
        const delayFrames = Math.floor((reactionMs / FRAME_TIME) || 0);
        if (cpuHistory.length > delayFrames) {
          const target = cpuHistory.shift();
          const center = opponent.y + paddleHeight / 2;
          if (center < target - 10) opponent.y += aiSpeed * dt;
          else if (center > target + 10) opponent.y -= aiSpeed * dt;
          opponent.y = Math.max(0, Math.min(height - paddleHeight, opponent.y));
          opponent.vy = 0; // AI velocity not tracked for spin
        }
      } else {
        applyInputs(opponent, remoteKeys, dt);
      }

      // move ball
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      trail.push({ x: ball.x, y: ball.y });
      if (trail.length > trailLength) trail.shift();

      // wall collisions
      if (ball.y < ball.size) {
        ball.y = ball.size;
        ball.vy *= -1;
      }
      if (ball.y > height - ball.size) {
        ball.y = height - ball.size;
        ball.vy *= -1;
      }

      const paddleCollision = (pad, dir) => {
        const padCenter = pad.y + paddleHeight / 2;
        const relative = (ball.y - padCenter) / (paddleHeight / 2);
        // add spin based on paddle velocity and impact point
        ball.vx = Math.abs(ball.vx) * dir;
        ball.vy += pad.vy * 0.1 + relative * 200;
        pad.scale = 1.2;
        pad.rot = relative * 0.3;
        ball.scale = 1.2;
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
        ball.vx > 0 &&
        ball.x + ball.size > opponent.x &&
        ball.y > opponent.y &&
        ball.y < opponent.y + paddleHeight
      ) {
        ball.x = opponent.x - ball.size;
        paddleCollision(opponent, -1);
      }

      // scoring
      if (ball.x < 0) {
        oppScore += 1;
        setScores({ player: playerScore, opponent: oppScore });
        resetBall(1);
      } else if (ball.x > width) {
        playerScore += 1;
        setScores({ player: playerScore, opponent: oppScore });
        resetBall(-1);
      }

      // check game end
      if (playerScore >= WIN_POINTS || oppScore >= WIN_POINTS) {
        const playerWon = playerScore > oppScore;
        setMatch((prev) => {
          const next = { ...prev };
          if (playerWon) next.player += 1;
          else next.opponent += 1;
          if (next.player >= 2 || next.opponent >= 2) {
            setMatchWinner(playerWon ? 'Player' : 'Opponent');
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

      saveState();
    };

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // clamp big jumps
      lastTime = now;
      if (!matchWinner) {
        update(dt);
      }
      draw();
      animationId = requestAnimationFrame(loop);
    };

    const handleMessage = (event) => {
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
    };

    if (mode === 'online' && channelRef.current) {
      channelRef.current.onmessage = handleMessage;
    }

    resetBall();
    lastTime = performance.now();
    loop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [difficulty, mode, connected, matchWinner, controls, canvasRef]);

  const resetGame = () => {
    if (resetRef.current) resetRef.current();
  };

  // --- WebRTC helpers ---
  const createConnection = async () => {
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
  };

  const acceptAnswer = async () => {
    const pc = peerRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(JSON.parse(answerSDP));
  };

  const joinConnection = async () => {
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
    await pc.setRemoteDescription(JSON.parse(offerSDP));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    pc.onicecandidate = (e) => {
      if (!e.candidate) setAnswerSDP(JSON.stringify(pc.localDescription));
    };
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
      <canvas
        ref={canvasRef}
        className="bg-black w-full h-full touch-none pong-canvas"
      />
      <div className="mt-2">Player: {scores.player} | Opponent: {scores.opponent}</div>
      <div className="mt-1">Games: {match.player} | {match.opponent}</div>
      {matchWinner && (
        <div className="mt-1 text-lg">Winner: {matchWinner}</div>
      )}

      <div className="mt-2 flex items-center space-x-2">
        <label>AI Difficulty: {difficulty}</label>
        <input
          type="range"
          min="1"
          max="10"
          value={difficulty}
          onChange={(e) => setDifficulty(parseInt(e.target.value, 10))}
        />
      </div>

      <div className="mt-2 space-x-2">
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setMode('cpu')}
        >
          vs CPU
        </button>
        <button
          className="px-2 py-1 bg-gray-700 rounded"
          onClick={() => setMode('online')}
        >
          Online
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
            />
          )}
          <textarea
            className="w-full text-black"
            placeholder="Paste remote SDP"
            value={answerSDP}
            onChange={(e) => setAnswerSDP(e.target.value)}
          />
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={offerSDP ? acceptAnswer : joinConnection}
          >
            {offerSDP ? 'Set Answer' : 'Join'}
          </button>
        </div>
      )}

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
