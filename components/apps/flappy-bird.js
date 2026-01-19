import React, { useCallback, useEffect, useRef, useState } from "react";
import useCanvasResize from "../../hooks/useCanvasResize";
import {
  BIRD_SKINS,
  BIRD_ANIMATION_FRAMES,
  PIPE_SKINS,
} from "../../apps/games/flappy-bird/skins";

const WIDTH = 400;
const HEIGHT = 300;

const FlappyBird = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const liveRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [gameState, setGameState] = useState("menu");
  const [skin, setSkin] = useState(0);
  const [pipeSkinIndex, setPipeSkinIndex] = useState(0);
  const birdImages = useRef([]);
  const birdFrames = useRef([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [pauseReason, setPauseReason] = useState(null);
  const pauseReasonRef = useRef(pauseReason);
  const startGameRef = useRef(null);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const [milestoneMessage, setMilestoneMessage] = useState(null);
  const milestoneTimeoutRef = useRef(null);
  const streakRef = useRef(0);
  const [streakCount, setStreakCount] = useState(0);
  const [showTouchControls, setShowTouchControls] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [bestOverall, setBestOverall] = useState(0);

  const resumeGame = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    setPauseReason(null);
    setGameState("running");
  }, []);

  const pauseGame = useCallback((reason = "user") => {
    pausedRef.current = true;
    setPaused(true);
    setPauseReason(reason);
    setGameState("paused");
  }, []);

  const goToMenu = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    setGameState("menu");
    setStarted(false);
  }, []);

  const restartGame = useCallback(() => {
    if (startGameRef.current) {
      startGameRef.current();
    }
  }, []);

  const triggerPointer = useCallback(() => {
    if (typeof window === "undefined") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const event = new MouseEvent("mousedown", {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(event);
  }, [canvasRef]);

  const syncLeaderboard = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = JSON.parse(
        localStorage.getItem("flappy-records") || "{}",
      );
      const entries = Object.entries(stored)
        .map(([mode, value]) => ({
          mode,
          score: value?.score ? Number(value.score) : 0,
        }))
        .filter((entry) => Number.isFinite(entry.score))
        .sort((a, b) => b.score - a.score);
      setLeaderboard(entries);
      setBestOverall(entries.length ? entries[0].score : 0);
    } catch {
      setLeaderboard([]);
      setBestOverall(0);
    }
  }, []);

  useEffect(() => {
    syncLeaderboard();
  }, [syncLeaderboard]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(pointer: coarse)");
    const handleChange = () => setShowTouchControls(query.matches);
    handleChange();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handleChange);
      return () => query.removeEventListener("change", handleChange);
    }
    query.addListener(handleChange);
    return () => query.removeListener(handleChange);
  }, []);

  useEffect(
    () => () => {
      if (milestoneTimeoutRef.current) {
        clearTimeout(milestoneTimeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    pauseReasonRef.current = pauseReason;
  }, [pauseReason]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleBlur = () => {
      if (!started || gameState !== "running") return;
      pauseGame("auto");
    };
    const handleFocus = () => {
      if (!started || pauseReasonRef.current !== "auto") return;
      if (gameState === "paused") {
        resumeGame();
      }
    };
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [gameState, pauseGame, resumeGame, started]);

  useEffect(() => {
    try {
      setSkin(parseInt(localStorage.getItem("flappy-bird-skin") || "0", 10));
      setPipeSkinIndex(
        parseInt(localStorage.getItem("flappy-pipe-skin") || "0", 10),
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    birdFrames.current = BIRD_ANIMATION_FRAMES.map((frames) =>
      frames.map((src) => {
        const img = new Image();
        img.src = src;
        return img;
      }),
    );
    birdImages.current = birdFrames.current.map((frames) => frames[0]);
  }, []);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = WIDTH;
    const height = HEIGHT;
    let reduceMotion =
      localStorage.getItem("flappy-reduced-motion") === "1" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let practiceMode = localStorage.getItem("flappy-practice") === "1";

    const GRAVITY_VARIANTS = [
      { name: "Easy", value: 0.2 },
      { name: "Normal", value: 0.4 },
      { name: "Hard", value: 0.6 },
    ];
    let gravityVariant = parseInt(
      localStorage.getItem("flappy-gravity-variant") || "1",
      10,
    );
    if (gravityVariant < 0 || gravityVariant >= GRAVITY_VARIANTS.length) {
      gravityVariant = 1;
    }

    const skinFrames =
      birdFrames.current.length > 0
        ? birdFrames.current
        : birdImages.current.map((img) => [img]);
    const pipeSkins = PIPE_SKINS;
    let birdSkin = skin;
    let pipeSkin = pipeSkinIndex;
    let birdFrameIndex = 0;
    let birdFrameTimer = 0;
    const birdFrameDelay = 6;

    let showHitbox = localStorage.getItem("flappy-hitbox") === "1";

    let bird = { x: 50, y: height / 2, vy: 0 };
    let gravity = GRAVITY_VARIANTS[gravityVariant].value;
    const jump = -7;

    const pipeWidth = 40;
    const baseGap = 80;
    const practiceGap = 120;
    const minGap = 60;
    let gap = practiceMode ? practiceGap : baseGap;
    let pipeInterval = 100;
    const pipeSpeed = 2;
    let nextPipeFrame = pipeInterval;

    let pipes = [];
    let frame = 0;
    let score = 0;
    let running = true;
    let crashing = false;
    let crashTimer = 0;
    let crashParticlesSpawned = false;
    let birdAngle = 0;
    let loopId = 0;
    let highHz = localStorage.getItem("flappy-120hz") === "1";
    let fps = highHz ? 120 : 60;

    let particles = [];

    let skyFrame = 0;
    let skyProgress = 0;
    let cloudsBack = [];
    let cloudsFront = [];
    let gust = 0;
    let gustTimer = 0;
    let foliage = [];
    let skylineBack = [];
    let skylineFront = [];
    let starfield = [];
    let groundTiles = [];
    let pipeGlowPhase = 0;

    function mixColor(c1, c2, t) {
      return `rgb(${Math.round(c1[0] + (c2[0] - c1[0]) * t)},${Math.round(
        c1[1] + (c2[1] - c1[1]) * t,
      )},${Math.round(c1[2] + (c2[2] - c1[2]) * t)})`;
    }

    function makeCloud(speed) {
      return {
        x: rand() * width,
        y: rand() * (height / 2),
        speed,
        scale: rand() * 0.5 + 0.5,
      };
    }

    function initClouds() {
      cloudsBack = Array.from({ length: 3 }, () => makeCloud(0.2));
      cloudsFront = Array.from({ length: 3 }, () => makeCloud(0.5));
    }

    function createPeakSet(count, minHeight, maxHeight) {
      return Array.from({ length: count }, () =>
        minHeight + rand() * (maxHeight - minHeight),
      );
    }

    function initSkyline() {
      const tilesNeeded = Math.ceil(width / 24) + 2;
      skylineBack = Array.from({ length: 2 }, (_, i) => ({
        x: i * width,
        speed: reduceMotion ? 0 : 0.2,
        peaks: createPeakSet(6, height * 0.25, height * 0.45),
      }));
      skylineFront = Array.from({ length: 2 }, (_, i) => ({
        x: i * width,
        speed: reduceMotion ? 0 : 0.45,
        peaks: createPeakSet(6, height * 0.4, height * 0.6),
      }));
      groundTiles = Array.from({ length: tilesNeeded }, (_, i) => ({
        x: i * 24,
        speed: 1.2,
      }));
    }

    function drawSkylineLayer(layer, color, alpha) {
      if (!layer.length) return;
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      for (const skyline of layer) {
        ctx.save();
        ctx.translate(skyline.x, 0);
        ctx.beginPath();
        ctx.moveTo(0, height);
        const step =
          skyline.peaks.length > 1 ? width / (skyline.peaks.length - 1) : width;
        skyline.peaks.forEach((peak, index) => {
          ctx.lineTo(index * step, height - peak);
        });
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function updateSkylineLayer(layer) {
      if (reduceMotion) return;
      for (const skyline of layer) {
        skyline.x -= skyline.speed;
        if (skyline.x <= -width) {
          skyline.x += width * layer.length;
        }
      }
    }

    function initStarfield() {
      starfield = reduceMotion
        ? []
        : Array.from({ length: 24 }, () => ({
            x: rand() * width,
            y: rand() * height * 0.4,
            speed: 0.1 + rand() * 0.1,
            size: rand() * 1.2 + 0.6,
            twinkle: rand() * Math.PI * 2,
          }));
    }

    function updateStarfield() {
      if (!starfield.length) return;
      for (const star of starfield) {
        star.x -= star.speed;
        star.twinkle += 0.04;
        if (star.x < -2) {
          star.x = width + rand() * 20;
          star.y = rand() * height * 0.4;
        }
      }
    }

    function drawStarfield() {
      if (!starfield.length) return;
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      for (const star of starfield) {
        const alpha = 0.5 + Math.sin(star.twinkle) * 0.5;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawGround() {
      ctx.save();
      const groundY = height - 10;
      ctx.fillStyle = "#2f1c0d";
      ctx.fillRect(0, groundY, width, 10);
      ctx.fillStyle = "#3b2815";
      for (const tile of groundTiles) {
        ctx.fillRect(tile.x, groundY - 3, 20, 3);
      }
      ctx.restore();
    }

    function updateGround() {
      if (reduceMotion) return;
      for (const tile of groundTiles) {
        tile.x -= tile.speed;
        if (tile.x <= -24) {
          tile.x += 24 * groundTiles.length;
        }
      }
    }

    function drawCloud(c) {
      ctx.save();
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 20 * c.scale, 12 * c.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(
        c.x + 15 * c.scale,
        c.y + 2 * c.scale,
        20 * c.scale,
        12 * c.scale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.ellipse(
        c.x - 15 * c.scale,
        c.y + 2 * c.scale,
        20 * c.scale,
        12 * c.scale,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }

    function updateClouds() {
      if (reduceMotion) return;
      for (const c of cloudsBack) {
        c.x -= c.speed + gust * 0.15;
        if (c.x < -50) c.x = width + rand() * 50;
      }
      for (const c of cloudsFront) {
        c.x -= c.speed + gust * 0.3;
        if (c.x < -50) c.x = width + rand() * 50;
      }
    }

    function updateWind() {
      if (reduceMotion) {
        gust = 0;
        gustTimer = 0;
        return;
      }
      if (gustTimer > 0) {
        gustTimer -= 1;
        if (gustTimer <= 0) gust = 0;
      } else if (rand() < 0.005) {
        gust = (rand() - 0.5) * 2;
        gustTimer = 60;
      }
    }

    function drawBackground() {
      const cycle = fps * 20;
      skyProgress = (Math.sin((skyFrame / cycle) * Math.PI * 2) + 1) / 2;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, mixColor([135, 206, 235], [24, 32, 72], skyProgress));
      grad.addColorStop(
        1,
        mixColor([135, 206, 235], [16, 22, 48], skyProgress),
      );
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      drawStarfield();
      skyFrame += 1;
    }

    function drawClouds() {
      for (const c of cloudsBack) drawCloud(c);
      for (const c of cloudsFront) drawCloud(c);
    }

    function drawFoliage() {
      if (reduceMotion) return;
      ctx.save();
      ctx.strokeStyle = "#2c5f2d";
      ctx.lineWidth = 3;
      for (const f of foliage) {
        const sway = gust * 0.5 + Math.sin((frame + f.x) / 18) * 0.3;
        const tipX = f.x + sway * f.h;
        const tipY = height - 12 - f.h;
        ctx.beginPath();
        ctx.moveTo(f.x, height - 12);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }
      ctx.restore();
    }

    function createRandom(seed) {
      let s = seed % 2147483647;
      if (s <= 0) s += 2147483646;
      return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    }

    let seed = Date.now();
    let rand = createRandom(seed);

    function initFoliage() {
      foliage = Array.from({ length: 6 }, () => ({
        x: rand() * width,
        h: rand() * 24 + 20,
      }));
    }

    function initDecor() {
      initClouds();
      initSkyline();
      initStarfield();
      initFoliage();
    }

    function spawnParticles(x, y, color, count = 14, speed = 2) {
      particles.push(
        ...Array.from({ length: count }, () => ({
          x,
          y,
          vx: (rand() - 0.5) * speed * 2,
          vy: (rand() - 0.2) * speed * 1.5,
          life: 30 + rand() * 15,
          color,
        })),
      );
    }

    function updateParticles() {
      particles = particles
        .map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.05,
          life: p.life - 1,
        }))
        .filter((p) => p.life > 0);
    }

    function drawParticles() {
      if (!particles.length) return;
      ctx.save();
      for (const p of particles) {
        ctx.globalAlpha = Math.max(p.life / 45, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const medalThresholds = [
      { name: "bronze", distance: 10 },
      { name: "silver", distance: 20 },
      { name: "gold", distance: 30 },
    ];
    let medals = {};
    try {
      medals = JSON.parse(localStorage.getItem("flappy-medals") || "{}");
    } catch {
      medals = {};
    }

    let records = {};
    try {
      records = JSON.parse(localStorage.getItem("flappy-records") || "{}");
    } catch {
      records = {};
    }
    let best = 0;
    let ghostRun = null;
    function loadRecord() {
      const key = GRAVITY_VARIANTS[gravityVariant].name;
      const rec = records[key];
      best = rec ? rec.score : 0;
      ghostRun = rec ? rec.run : null;
      bestRef.current = best;
    }
    loadRecord();
    function getMedal(dist) {
      let m = null;
      for (const { name, distance } of medalThresholds) {
        if (dist >= distance) m = name;
      }
      return m;
    }
    function saveMedal(dist) {
      const medal = getMedal(dist);
      if (medal) {
        medals[dist] = medal;
        localStorage.setItem("flappy-medals", JSON.stringify(medals));
      }
    }

    let flapFrames = [];
    let lastRun = null;
    let isReplaying = false;
    let replayFlaps = [];
    let replayIndex = 0;
    let runPositions = [];
    let ghostFrame = 0;

    function pipeExtents(pipe) {
      const wobble = reduceMotion ? 0 : Math.sin(frame / 18 + pipe.phase) * pipe.amplitude;
      let top = pipe.baseTop + wobble;
      let bottom = pipe.baseBottom + wobble;
      const clampOffset = Math.max(0, 20 - top);
      if (clampOffset) {
        top += clampOffset;
        bottom += clampOffset;
      }
      if (bottom > height - 20) {
        const diff = bottom - (height - 20);
        top -= diff;
        bottom -= diff;
      }
      return { top, bottom };
    }

    function addPipe() {
      const topBase = rand() * (height - gap - 40) + 20;
      const amplitude = reduceMotion ? 0 : rand() * 6 + 4;
      const phase = rand() * Math.PI * 2;
      pipes.push({
        x: width,
        baseTop: topBase,
        baseBottom: topBase + gap,
        amplitude,
        phase,
      });
    }

    function reset(newSeed = Date.now()) {
      seed = newSeed;
      rand = createRandom(seed);
      bird = { x: 50, y: height / 2, vy: 0 };
      pipes = [];
      frame = 0;
      score = 0;
      running = true;
      crashing = false;
      crashTimer = 0;
      crashParticlesSpawned = false;
      birdAngle = 0;
      flapFrames = [];
      runPositions = [];
      ghostFrame = 0;
      gravity = GRAVITY_VARIANTS[gravityVariant].value;
      gap = practiceMode ? practiceGap : baseGap;
      pipeInterval = 100;
      nextPipeFrame = pipeInterval;
      particles = [];
      initDecor();
      gust = 0;
      gustTimer = 0;
      scoreRef.current = 0;
      bestRef.current = best;
      streakRef.current = 0;
      setStreakCount(0);
      if (milestoneTimeoutRef.current) {
        clearTimeout(milestoneTimeoutRef.current);
      }
      setMilestoneMessage(null);
    }

    function startGame(newSeed = Date.now()) {
      resumeGame();
      reset(newSeed);
      addPipe();
      startLoop();
      if (liveRef.current) liveRef.current.textContent = "Score: 0";
    }

    function flap(record = true) {
      bird.vy = jump;
      birdFrameTimer = 0;
      if (record) flapFrames.push(frame);
    }

    function draw() {
      drawBackground();
      drawSkylineLayer(skylineBack, "#18324a", 0.6);
      drawSkylineLayer(skylineFront, "#234c63", 0.85);
      drawClouds();
      drawGround();
      drawFoliage();

      const [pipeC1, pipeC2] = pipeSkins[pipeSkin % pipeSkins.length];
      const pipeColor = mixColor(pipeC1, pipeC2, skyProgress);
      ctx.fillStyle = pipeColor;
      for (const pipe of pipes) {
        const { top, bottom } = pipeExtents(pipe);
        if (practiceMode) ctx.globalAlpha = 0.4;
        ctx.fillRect(pipe.x, 0, pipeWidth, top);
        ctx.fillRect(pipe.x, bottom, pipeWidth, height - bottom);
        const glowStrength = reduceMotion
          ? 0.2
          : (Math.sin(pipeGlowPhase + pipe.x / 40) + 1) / 2;
        const bevel = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
        bevel.addColorStop(0, `rgba(255,255,255,${0.2 + glowStrength * 0.1})`);
        bevel.addColorStop(1, `rgba(0,0,0,${0.4 - glowStrength * 0.1})`);
        ctx.fillStyle = bevel;
        ctx.fillRect(pipe.x, 0, pipeWidth, top);
        ctx.fillRect(pipe.x, bottom, pipeWidth, height - bottom);
        ctx.fillStyle = pipeColor;
        ctx.fillRect(pipe.x, top - 2, pipeWidth, 2);
        ctx.fillRect(pipe.x, bottom, pipeWidth, 2);
        if (showHitbox) {
          ctx.strokeStyle = "red";
          ctx.strokeRect(pipe.x, 0, pipeWidth, top);
          ctx.strokeRect(pipe.x, bottom, pipeWidth, height - bottom);
        }
        if (practiceMode) ctx.globalAlpha = 1;
      }

      drawParticles();

      if (ghostRun && ghostFrame < ghostRun.pos.length) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "gray";
        ctx.beginPath();
        ctx.arc(bird.x, ghostRun.pos[ghostFrame], 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const frames = skinFrames[birdSkin % skinFrames.length];
      const img = frames[birdFrameIndex % frames.length];
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(birdAngle);
      if (img && img.complete) {
        ctx.drawImage(img, -12, -10, 24, 20);
      } else {
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      if (showHitbox) {
        ctx.strokeStyle = "red";
        ctx.strokeRect(-10, -10, 20, 20);
      }
      ctx.restore();

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(8, 8, 200, 160);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      let hudY = 28;
      const hudLine = (text) => {
        ctx.fillText(text, 16, hudY);
        hudY += 20;
      };
      hudLine(`Score: ${score}`);
      hudLine(`Best: ${best}`);
      hudLine(`Seed: ${seed}`);
      const medal = getMedal(score);
      if (medal) hudLine(`Medal: ${medal}`);
      if (practiceMode) hudLine("Practice");
      hudLine(`Gravity: ${GRAVITY_VARIANTS[gravityVariant].name}`);
      if (reduceMotion) hudLine("Reduced Motion");
      if (showHitbox) hudLine("Hitbox");

      if (!running) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "24px sans-serif";
        ctx.fillText("Game Over", width / 2, height / 2);
        ctx.font = "16px sans-serif";
        ctx.fillText(
          "Press Space or Click to restart",
          width / 2,
          height / 2 + 30,
        );
        if (lastRun)
          ctx.fillText("Press R to replay", width / 2, height / 2 + 50);
        if (ghostRun)
          ctx.fillText("Press Shift+R for best", width / 2, height / 2 + 70);
        ctx.textAlign = "left";
      }
    }

    function update() {
      if (pausedRef.current) {
        draw();
        return;
      }

      if (crashing) {
        bird.vy += gravity * 2;
        bird.y += bird.vy;
        birdAngle += 0.3;
        draw();
        crashTimer -= 1;
        if (bird.y + 10 > height || crashTimer <= 0) {
          crashing = false;
          running = false;
        }
        if (!crashing && !running) {
          if (!isReplaying) {
            saveMedal(score);
            if (score > best) {
              best = score;
              bestRef.current = best;
              records[GRAVITY_VARIANTS[gravityVariant].name] = {
                score: best,
                run: {
                  pos: runPositions.slice(),
                  flaps: flapFrames.slice(),
                  seed,
                },
              };
              localStorage.setItem("flappy-records", JSON.stringify(records));
              ghostRun = records[GRAVITY_VARIANTS[gravityVariant].name].run;
              syncLeaderboard();
            }
            lastRun = { seed, flaps: flapFrames };
          }
          isReplaying = false;
          stopLoop();
          setGameState("gameover");
          streakRef.current = 0;
          setStreakCount(0);
          if (liveRef.current)
            liveRef.current.textContent = `Game over. Final score: ${score}`;
        }
        return;
      }

      frame += 1;
      pipeGlowPhase += reduceMotion ? 0 : 0.05;

      updateWind();
      updateClouds();
      updateSkylineLayer(skylineBack);
      updateSkylineLayer(skylineFront);
      updateStarfield();
      updateGround();
      updateParticles();

      if (frame >= nextPipeFrame) {
        gap = practiceMode
          ? practiceGap
          : Math.max(minGap, baseGap - Math.floor(score / 5) * 2);
        addPipe();
        pipeInterval = Math.max(60, 100 - Math.floor(score / 5) * 5);
        nextPipeFrame = frame + pipeInterval;
      }

      if (
        isReplaying &&
        replayIndex < replayFlaps.length &&
        frame === replayFlaps[replayIndex]
      ) {
        flap(false);
        replayIndex += 1;
      }

      bird.vy += gravity;
      bird.y += bird.vy;
      runPositions.push(bird.y);

      birdAngle = Math.max(-0.5, Math.min(0.7, bird.vy / 10));
      birdFrameTimer += 1;
      if (birdFrameTimer >= birdFrameDelay) {
        birdFrameTimer = 0;
        const totalFrames = skinFrames[birdSkin % skinFrames.length].length;
        birdFrameIndex = (birdFrameIndex + 1) % totalFrames;
      }

      if (bird.y + 10 > height || bird.y - 10 < 0) {
        crashing = true;
        crashTimer = 18;
        if (!crashParticlesSpawned) {
          spawnParticles(bird.x, bird.y, "#fbd34d", 24, 3);
          crashParticlesSpawned = true;
        }
      }

      let passed = 0;
      for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed;
        const { top, bottom } = pipeExtents(pipe);

        if (
          !practiceMode &&
          pipe.x < bird.x + 10 &&
          pipe.x + pipeWidth > bird.x - 10 &&
          (bird.y - 10 < top || bird.y + 10 > bottom)
        ) {
          crashing = true;
          crashTimer = 18;
          if (!crashParticlesSpawned) {
            spawnParticles(bird.x, bird.y, "#fbd34d", 24, 3);
            crashParticlesSpawned = true;
          }
        }

        if (pipe.x + pipeWidth < 0) {
          passed += 1;
        }
      }

      if (passed) {
        score += passed;
        pipes = pipes.filter((p) => p.x + pipeWidth >= 0);
        if (liveRef.current) liveRef.current.textContent = `Score: ${score}`;
        scoreRef.current = score;
        streakRef.current += passed;
        setStreakCount(streakRef.current);
        if (score > 0 && score % 10 === 0) {
          const message = `Milestone! ${score} points`;
          setMilestoneMessage(message);
          if (milestoneTimeoutRef.current) {
            clearTimeout(milestoneTimeoutRef.current);
          }
          milestoneTimeoutRef.current = setTimeout(() => {
            setMilestoneMessage(null);
          }, 2400);
          spawnParticles(bird.x + 10, height / 2, "#8ff7ff", 18, 3);
        }
      }

      draw();
      if (ghostRun && ghostFrame < ghostRun.pos.length) {
        ghostFrame += 1;
      }
    }

    function startLoop() {
      stopLoop();
      fps = highHz ? 120 : 60;
      if (practiceMode) fps /= 2;
      let last = performance.now();
      const frameFunc = (now) => {
        loopId = requestAnimationFrame(frameFunc);
        if (now - last >= 1000 / fps) {
          update();
          last = now;
        }
      };
      loopId = requestAnimationFrame(frameFunc);
    }

    function stopLoop() {
      if (loopId) cancelAnimationFrame(loopId);
    }

    function handleKey(e) {
      if (pausedRef.current) {
        if (e.code === "Escape" || e.code === "Space") {
          resumeGame();
        }
        return;
      }

      if (e.code === "Escape" && running) {
        pauseGame();
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (running) {
          flap();
        } else {
          startGame();
        }
      } else if (e.code === "KeyR" && !running) {
        if (e.shiftKey) {
          if (ghostRun && ghostRun.seed !== undefined && ghostRun.flaps) {
            isReplaying = true;
            replayFlaps = ghostRun.flaps || [];
            replayIndex = 0;
            startGame(ghostRun.seed);
          }
        } else if (lastRun) {
          isReplaying = true;
          replayFlaps = lastRun.flaps;
          replayIndex = 0;
          startGame(lastRun.seed);
        }
      } else if (e.code === "KeyF") {
        highHz = !highHz;
        localStorage.setItem("flappy-120hz", highHz ? "1" : "0");
        if (running) startLoop();
      } else if (e.code === "KeyM") {
        reduceMotion = !reduceMotion;
        localStorage.setItem("flappy-reduced-motion", reduceMotion ? "1" : "0");
        if (liveRef.current)
          liveRef.current.textContent = `Reduced motion ${reduceMotion ? "on" : "off"}`;
        initDecor();
      } else if (e.code === "KeyP") {
        practiceMode = !practiceMode;
        localStorage.setItem("flappy-practice", practiceMode ? "1" : "0");
        if (liveRef.current)
          liveRef.current.textContent = practiceMode
            ? "Practice mode on"
            : "Practice mode off";
        startGame();
      } else if (e.code === "KeyG" && !running) {
        gravityVariant = (gravityVariant + 1) % GRAVITY_VARIANTS.length;
        localStorage.setItem("flappy-gravity-variant", String(gravityVariant));
        loadRecord();
        if (liveRef.current)
          liveRef.current.textContent = `Gravity: ${GRAVITY_VARIANTS[gravityVariant].name}`;
      } else if (e.code === "KeyX" && !running) {
        const key = GRAVITY_VARIANTS[gravityVariant].name;
        delete records[key];
        localStorage.setItem("flappy-records", JSON.stringify(records));
        loadRecord();
        syncLeaderboard();
        if (liveRef.current) liveRef.current.textContent = "Record reset";
      } else if (e.code === "KeyB") {
        birdSkin = (birdSkin + 1) % skinFrames.length;
        setSkin(birdSkin);
        localStorage.setItem("flappy-bird-skin", String(birdSkin));
        if (liveRef.current)
          liveRef.current.textContent = `Bird skin ${birdSkin + 1}`;
      } else if (e.code === "KeyO") {
        pipeSkin = (pipeSkin + 1) % pipeSkins.length;
        setPipeSkinIndex(pipeSkin);
        localStorage.setItem("flappy-pipe-skin", String(pipeSkin));
        if (liveRef.current)
          liveRef.current.textContent = `Pipe skin ${pipeSkin + 1}`;
      } else if (e.code === "KeyH") {
        showHitbox = !showHitbox;
        localStorage.setItem("flappy-hitbox", showHitbox ? "1" : "0");
        if (liveRef.current)
          liveRef.current.textContent = showHitbox ? "Hitbox on" : "Hitbox off";
      }
    }

    function handlePointer() {
      if (pausedRef.current) {
        resumeGame();
      } else if (running) {
        flap();
      } else {
        startGame();
      }
    }

    startGameRef.current = startGame;

    window.addEventListener("keydown", handleKey, { passive: false });
    canvas.addEventListener("mousedown", handlePointer);
    canvas.addEventListener("touchstart", handlePointer, { passive: true });

    startGame();

    return () => {
      startGameRef.current = null;
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("mousedown", handlePointer);
      canvas.removeEventListener("touchstart", handlePointer);
      stopLoop();
    };
  }, [canvasRef, started, pipeSkinIndex, skin, pauseGame, resumeGame, syncLeaderboard]);

  const leaderboardItems = leaderboard.slice(0, 5);

  return (
    <div className="relative h-full w-full">
      {started && (
        <button
          type="button"
          className="absolute right-3 top-3 z-30 rounded-md bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow transition hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-sky-400"
          onClick={() => {
            if (paused) {
              resumeGame();
            } else {
              pauseGame();
            }
          }}
        >
          {paused ? "Resume" : "Pause"}
        </button>
      )}

      {streakCount > 0 && (
        <div className="absolute left-3 top-3 z-20 rounded-md bg-black/60 px-3 py-1 text-sm font-semibold text-teal-200 shadow">
          Streak: {streakCount}
        </div>
      )}

      {milestoneMessage && (
        <div className="pointer-events-none absolute left-1/2 top-8 z-30 -translate-x-1/2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-yellow-200 shadow-lg backdrop-blur transition-opacity duration-300">
          {milestoneMessage}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="h-full w-full bg-black"
        role="img"
        aria-label="Flappy Bird game"
      />

      {gameState === "menu" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-6 bg-black/80 p-6 text-white transition-opacity duration-300">
          <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
            <div className="space-y-4 text-left">
              <label className="flex flex-col text-sm">
                <span className="text-xs uppercase tracking-widest text-white/60">Bird Skin</span>
                <select
                  className="mt-1 rounded border border-white/20 bg-white/90 px-3 py-2 text-black"
                  value={skin}
                  onChange={(e) => setSkin(parseInt(e.target.value, 10))}
                >
                  {BIRD_SKINS.map((name, i) => (
                    <option key={name} value={i}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm">
                <span className="text-xs uppercase tracking-widest text-white/60">Pipe Skin</span>
                <select
                  className="mt-1 rounded border border-white/20 bg-white/90 px-3 py-2 text-black"
                  value={pipeSkinIndex}
                  onChange={(e) => setPipeSkinIndex(parseInt(e.target.value, 10))}
                >
                  {PIPE_SKINS.map((_, i) => (
                    <option key={i} value={i}>
                      {`Skin ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-lg bg-white/10 p-4 text-xs uppercase tracking-widest text-white/70">
                <p>Space / tap to flap</p>
                <p className="mt-1">Esc to pause · R to replay · G to cycle gravity</p>
                <p className="mt-1">B to change bird · O to change pipes</p>
              </div>
            </div>
            <div className="rounded-lg bg-white/10 p-4 backdrop-blur">
              <h3 className="text-lg font-semibold">High Scores</h3>
              <p className="text-sm text-white/70">
                Best overall: <span className="font-semibold text-white">{bestOverall}</span>
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {leaderboardItems.length ? (
                  leaderboardItems.map(({ mode, score }) => (
                    <li key={mode} className="flex items-center justify-between rounded bg-black/30 px-3 py-1">
                      <span className="font-semibold uppercase tracking-wide text-white/80">{mode}</span>
                      <span>{score}</span>
                    </li>
                  ))
                ) : (
                  <li className="rounded bg-black/30 px-3 py-2 text-white/60">No runs recorded yet.</li>
                )}
              </ul>
            </div>
          </div>
          <button
            className="w-40 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg transition hover:bg-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-300"
            onClick={() => {
              try {
                localStorage.setItem("flappy-bird-skin", String(skin));
                localStorage.setItem("flappy-pipe-skin", String(pipeSkinIndex));
              } catch {
                /* ignore */
              }
              resumeGame();
              setStarted(true);
            }}
          >
            Start Flight
          </button>
        </div>
      )}

      {gameState === "paused" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-4 bg-black/60 p-6 text-white transition-opacity duration-300">
          <div className="rounded-lg bg-white/10 px-6 py-4 text-center shadow-lg backdrop-blur">
            <h3 className="text-2xl font-semibold">Paused</h3>
            <p className="mt-2 text-sm text-white/80">Score: {scoreRef.current}</p>
            <p className="text-sm text-white/60">Best this mode: {bestRef.current}</p>
          </div>
          <button
            className="w-36 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-300"
            onClick={resumeGame}
          >
            Resume
          </button>
        </div>
      )}

      {gameState === "gameover" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-6 bg-black/75 p-6 text-white transition-opacity duration-300">
          <div className="w-full max-w-md rounded-lg bg-white/10 p-6 text-center shadow-xl backdrop-blur">
            <h3 className="text-3xl font-semibold">Game Over</h3>
            <p className="mt-4 text-lg">Final score: {scoreRef.current}</p>
            <p className="text-sm text-white/70">Best this mode: {bestRef.current}</p>
            <p className="text-sm text-white/60">Global best: {bestOverall}</p>
            <div className="mt-4 text-left">
              <h4 className="text-sm font-semibold uppercase tracking-widest text-white/70">Leaderboard</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {leaderboardItems.length ? (
                  leaderboardItems.map(({ mode, score }) => (
                    <li key={mode} className="flex items-center justify-between rounded bg-black/30 px-3 py-1">
                      <span className="font-semibold uppercase tracking-wide text-white/80">{mode}</span>
                      <span>{score}</span>
                    </li>
                  ))
                ) : (
                  <li className="rounded bg-black/30 px-3 py-2 text-white/60">No scores yet.</li>
                )}
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              className="rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow hover:bg-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-300"
              onClick={restartGame}
            >
              Play Again
            </button>
            <button
              className="rounded-full bg-white/20 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white hover:bg-white/30 focus:outline-none focus:ring-4 focus:ring-white/40"
              onClick={goToMenu}
            >
              Change Skins
            </button>
          </div>
        </div>
      )}

      {showTouchControls && gameState === "running" && (
        <div className="absolute inset-x-0 bottom-4 z-30 flex justify-center gap-4 px-4">
          <button
            className="flex-1 rounded-full bg-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow backdrop-blur hover:bg-white/30 focus:outline-none focus:ring-4 focus:ring-white/40"
            onClick={triggerPointer}
          >
            Flap
          </button>
          <button
            className="flex-1 rounded-full bg-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow backdrop-blur hover:bg-white/30 focus:outline-none focus:ring-4 focus:ring-white/40"
            onClick={pauseGame}
          >
            Pause
          </button>
        </div>
      )}

      <div ref={liveRef} className="sr-only" aria-live="polite" />
    </div>
  );

};
