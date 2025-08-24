import React, { useRef, useEffect } from 'react';
import {
  TILE,
  PAD_POSITIONS,
  initLane,
  updateCars,
  handlePads,
  rampLane,
  carLaneDefs,
  logLaneDefs,
} from '../../apps/frogger';

const Frogger = () => {
  const bgRef = useRef(null);
  const spriteRef = useRef(null);

  useEffect(() => {
    const bg = bgRef.current;
    const fg = spriteRef.current;
    const bgCtx = bg.getContext('2d');
    const ctx = fg.getContext('2d');
    const width = fg.width;
    const height = fg.height;
    const tile = TILE;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const speedScale = prefersReducedMotion ? 0.5 : 1;

    let level = parseInt(localStorage.getItem('frogger-level') || '1', 10);
    let score = 0;
    let pads = PAD_POSITIONS.map(() => false);

    const lanes = [];

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, duration = 0.1) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + duration
      );
      osc.stop(audioCtx.currentTime + duration);
    };

    const drawBackground = () => {
      bgCtx.fillStyle = '#222';
      bgCtx.fillRect(0, 0, width, height);
      bgCtx.fillStyle = '#444';
      for (let i = 1; i < 9; i++) {
        if (i === 9) continue;
        bgCtx.fillRect(0, i * tile, width, 2);
      }
      bgCtx.fillStyle = '#0a0';
      bgCtx.fillRect(0, 0, width, tile);
      bgCtx.fillRect(0, height - tile, width, tile);
    };

    const frog = { x: width / 2 - tile / 2, y: height - tile, size: tile };

    const resetFrog = () => {
      frog.x = width / 2 - tile / 2;
      frog.y = height - tile;
    };

    const initLevel = () => {
      lanes.length = 0;
      carLaneDefs.forEach((def, i) => {
        const lane = rampLane(
          { ...def, y: height - tile * (2 + i) },
          level,
          0.3
        );
        lane.speed *= speedScale;
        lanes.push(initLane(lane, i + 1));
      });
      logLaneDefs.forEach((def, i) => {
        const lane = rampLane(
          { ...def, y: tile * (1 + i) },
          level,
          0.5
        );
        lane.speed *= speedScale;
        lanes.push(initLane(lane, i + 10));
      });
      pads = PAD_POSITIONS.map(() => false);
      resetFrog();
    };

    const moveFrog = (dx, dy) => {
      audioCtx.resume();
      frog.x = Math.min(Math.max(0, frog.x + dx * tile), width - tile);
      frog.y = Math.min(Math.max(0, frog.y + dy * tile), height - tile);
      playTone(440, 0.05);
    };

    const handleKey = (e) => {
      if (e.key === 'ArrowUp') moveFrog(0, -1);
      else if (e.key === 'ArrowDown') moveFrog(0, 1);
      else if (e.key === 'ArrowLeft') moveFrog(-1, 0);
      else if (e.key === 'ArrowRight') moveFrog(1, 0);
    };
    window.addEventListener('keydown', handleKey);

    let touchStart = null;
    const handleTouchStart = (e) => {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    };
    const handleTouchEnd = (e) => {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) > 20) {
        if (absX > absY) moveFrog(dx > 0 ? 1 : -1, 0);
        else moveFrog(0, dy > 0 ? 1 : -1);
      } else {
        moveFrog(0, -1);
      }
      touchStart = null;
    };
    fg.addEventListener('touchstart', handleTouchStart);
    fg.addEventListener('touchend', handleTouchEnd);
    const handleTap = () => moveFrog(0, -1);
    fg.addEventListener('click', handleTap);

    let tilt = { x: 0, y: 0 };
    const handleOrientation = (e) => {
      tilt = { x: e.gamma || 0, y: e.beta || 0 };
    };
    window.addEventListener('deviceorientation', handleOrientation);

    let tiltCooldown = 0;
    let padCooldown = 0;

    let lastTime = performance.now();
    const update = (time) => {
      const dt = Math.min((time - lastTime) / (1000 / 60), 3);
      lastTime = time;

      tiltCooldown = Math.max(0, tiltCooldown - dt);
      padCooldown = Math.max(0, padCooldown - dt);

      const gp = navigator.getGamepads ? navigator.getGamepads()[0] : null;
      if (gp && padCooldown <= 0) {
        const axX = gp.axes[0];
        const axY = gp.axes[1];
        const btn = gp.buttons;
        if (btn[12]?.pressed || axY < -0.5) {
          moveFrog(0, -1);
          padCooldown = 10;
        } else if (btn[13]?.pressed || axY > 0.5) {
          moveFrog(0, 1);
          padCooldown = 10;
        } else if (btn[14]?.pressed || axX < -0.5) {
          moveFrog(-1, 0);
          padCooldown = 10;
        } else if (btn[15]?.pressed || axX > 0.5) {
          moveFrog(1, 0);
          padCooldown = 10;
        }
      }

      if (tiltCooldown <= 0) {
        if (tilt.y < -15) {
          moveFrog(0, -1);
          tiltCooldown = 10;
        } else if (tilt.y > 15) {
          moveFrog(0, 1);
          tiltCooldown = 10;
        } else if (tilt.x < -15) {
          moveFrog(-1, 0);
          tiltCooldown = 10;
        } else if (tilt.x > 15) {
          moveFrog(1, 0);
          tiltCooldown = 10;
        }
      }

      ctx.clearRect(0, 0, width, height);

      const result = updateCars(lanes, frog, dt);
      lanes.splice(0, lanes.length, ...result.lanes);
      frog.x += result.frogDx;
      if (result.dead) {
        playTone(200, 0.2);
        resetFrog();
        score = Math.max(0, score - 10);
      }

      if (frog.y <= 0) {
        const padResult = handlePads({ x: frog.x, y: 0 }, pads);
        pads = padResult.pads;
        if (padResult.padHit) {
          playTone(800, 0.2);
          score += 100;
          if (pads.every(Boolean)) {
            level += 1;
            localStorage.setItem('frogger-level', level.toString());
            initLevel();
          } else {
            resetFrog();
          }
        } else {
          playTone(200, 0.2);
          resetFrog();
        }
      }

      lanes.forEach((lane) => {
        ctx.fillStyle = lane.type === 'car' ? '#888' : '#964B00';
        lane.items.forEach((v) => {
          ctx.fillRect(v.x, lane.y, v.width, TILE);
        });
      });

      ctx.fillStyle = '#0f0';
      ctx.fillRect(frog.x, frog.y, frog.size, frog.size);
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Score: ${score} Level: ${level}`, 10, 20);

      requestAnimationFrame(update);
    };

    drawBackground();
    initLevel();
    requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKey);
      fg.removeEventListener('touchstart', handleTouchStart);
      fg.removeEventListener('touchend', handleTouchEnd);
      fg.removeEventListener('click', handleTap);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={bgRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full"
      />
      <canvas
        ref={spriteRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export {
  initLane,
  updateCars,
  handlePads,
  PAD_POSITIONS,
  rampLane,
  carLaneDefs,
  logLaneDefs,
};

export default Frogger;
