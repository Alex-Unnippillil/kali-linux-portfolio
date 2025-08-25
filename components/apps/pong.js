import React, { useRef, useEffect, useState } from 'react';

// Basic timing constants so the simulation is consistent across refresh rates
const FRAME_TIME = 1000 / 60; // ideal frame time in ms

// Pong component with spin, adjustable AI and experimental WebRTC multiplayer
const Pong = () => {
  const canvasRef = useRef(null);
  const resetRef = useRef(null);
  const peerRef = useRef(null);
  const channelRef = useRef(null);

  const [scores, setScores] = useState({ player: 0, opponent: 0 });
  const [reaction, setReaction] = useState(200); // ms reaction time for the AI
  const [mode, setMode] = useState('cpu'); // 'cpu' or 'online'
  const [offerSDP, setOfferSDP] = useState('');
  const [answerSDP, setAnswerSDP] = useState('');
  const [connected, setConnected] = useState(false);

  // Main game effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const paddleHeight = 80;
    const paddleWidth = 10;

    const player = { x: 10, y: height / 2 - paddleHeight / 2, vy: 0 };
    const opponent = {
      x: width - paddleWidth - 10,
      y: height / 2 - paddleHeight / 2,
      vy: 0,
    };
    const ball = { x: width / 2, y: height / 2, vx: 200, vy: 120, size: 8 };

    let playerScore = 0;
    let oppScore = 0;
    const keys = { up: false, down: false };
    const remoteKeys = { up: false, down: false };

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

    const resetBall = (dir = Math.random() > 0.5 ? 1 : -1) => {
      ball.x = width / 2;
      ball.y = height / 2;
      ball.vx = 200 * dir;
      ball.vy = Math.random() * 160 - 80;
    };

    resetRef.current = () => {
      playerScore = 0;
      oppScore = 0;
      setScores({ player: 0, opponent: 0 });
      player.y = height / 2 - paddleHeight / 2;
      opponent.y = height / 2 - paddleHeight / 2;
      resetBall();
    };

    const draw = () => {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'white';
      ctx.fillRect(player.x, player.y, paddleWidth, paddleHeight);
      ctx.fillRect(opponent.x, opponent.y, paddleWidth, paddleHeight);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
      ctx.fill();
    };

    const applyInputs = (pad, control, dt) => {
      const speed = 300; // px per second
      const prev = pad.y;
      if (control.up) pad.y -= speed * dt;
      if (control.down) pad.y += speed * dt;
      pad.y = Math.max(0, Math.min(height - paddleHeight, pad.y));
      pad.vy = pad.y - prev;
    };

    const update = (dt) => {
      frame += 1;
      // local player
      applyInputs(player, keys, dt);

      // opponent (AI or remote)
      if (mode === 'cpu') {
        // simple reaction delay using a queue of previous ball positions
        cpuHistory.push(ball.y);
        const delayFrames = Math.floor((reaction / FRAME_TIME) || 0);
        if (cpuHistory.length > delayFrames) {
          const target = cpuHistory.shift();
          const center = opponent.y + paddleHeight / 2;
          if (center < target - 10) opponent.y += 250 * dt;
          else if (center > target + 10) opponent.y -= 250 * dt;
          opponent.y = Math.max(0, Math.min(height - paddleHeight, opponent.y));
          opponent.vy = 0; // AI velocity not tracked for spin
        }
      } else {
        applyInputs(opponent, remoteKeys, dt);
      }

      // move ball
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

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
        ball.vy += pad.vy * 5 + relative * 200;
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

      saveState();
    };

    const cpuHistory = [];

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // clamp big jumps
      lastTime = now;
      update(dt);
      draw();
      animationId = requestAnimationFrame(loop);
    };

    const keyDown = (e) => {
      if (e.key === 'ArrowUp') keys.up = true;
      if (e.key === 'ArrowDown') keys.down = true;
      if (mode === 'online' && channelRef.current) {
        channelRef.current.send(
          JSON.stringify({ type: 'input', frame: frame + 1, ...keys })
        );
      }
    };
    const keyUp = (e) => {
      if (e.key === 'ArrowUp') keys.up = false;
      if (e.key === 'ArrowDown') keys.down = false;
      if (mode === 'online' && channelRef.current) {
        channelRef.current.send(
          JSON.stringify({ type: 'input', frame: frame + 1, ...keys })
        );
      }
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

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    resetBall();
    lastTime = performance.now();
    loop();

    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      cancelAnimationFrame(animationId);
    };
  }, [reaction, mode, connected]);

  const resetGame = () => {
    if (resetRef.current) resetRef.current();
  };

  // --- WebRTC helpers ---
  const createConnection = async () => {
    const pc = new RTCPeerConnection();
    const channel = pc.createDataChannel('pong');
    channel.onopen = () => setConnected(true);
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
      channel.onmessage = (ev) => {};
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
      <canvas ref={canvasRef} width={600} height={400} className="bg-black" />
      <div className="mt-2">Player: {scores.player} | Opponent: {scores.opponent}</div>

      <div className="mt-2 flex items-center space-x-2">
        <label>AI Reaction: {reaction}ms</label>
        <input
          type="range"
          min="0"
          max="500"
          value={reaction}
          onChange={(e) => setReaction(parseInt(e.target.value, 10))}
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

