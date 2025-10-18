import React, { useEffect, useMemo, useRef, useState } from "react";
import useCanvasResize from "../../hooks/useCanvasResize";
import {
  BIRD_SKINS,
  BIRD_ASSETS,
  PIPE_SKINS,
} from "../../apps/games/flappy-bird/skins";

const WIDTH = 400;
const HEIGHT = 300;

const DIFFICULTY_PROFILES = [
  {
    id: "classic",
    label: "Classic",
    description: "Balanced ramp with steady speed growth and mild gap changes.",
    speed: {
      start: 2,
      max: 4.2,
      increment: 0.08,
      mobileScale: 0.85,
    },
    gap: {
      base: 90,
      min: 58,
      shrinkAmount: 2,
      shrinkRate: 5,
      variance: 12,
    },
    spawn: {
      base: 100,
      min: 70,
      step: 5,
      scoreStep: 5,
    },
  },
  {
    id: "arcade",
    label: "Arcade",
    description: "Faster pipes and aggressive gap variance for thrill seekers.",
    speed: {
      start: 2.4,
      max: 5.2,
      increment: 0.12,
      mobileScale: 0.8,
    },
    gap: {
      base: 86,
      min: 52,
      shrinkAmount: 3,
      shrinkRate: 4,
      variance: 18,
    },
    spawn: {
      base: 92,
      min: 64,
      step: 6,
      scoreStep: 4,
    },
  },
  {
    id: "zen",
    label: "Zen",
    description: "Gentle ramp that favours practice and relaxed play.",
    speed: {
      start: 1.8,
      max: 3.4,
      increment: 0.05,
      mobileScale: 0.9,
    },
    gap: {
      base: 96,
      min: 64,
      shrinkAmount: 1,
      shrinkRate: 6,
      variance: 8,
    },
    spawn: {
      base: 104,
      min: 78,
      step: 4,
      scoreStep: 6,
    },
  },
];

const FlappyBird = () => {
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const liveRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [skin, setSkin] = useState(0);
  const [pipeSkinIndex, setPipeSkinIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState(
    DIFFICULTY_PROFILES[0].id,
  );
  const birdImages = useRef([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const leaderboardRef = useRef([]);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const shareTimeoutRef = useRef(null);

  const difficultyProfile = useMemo(() => {
    const found = DIFFICULTY_PROFILES.find(
      (profile) => profile.id === selectedDifficulty,
    );
    return found || DIFFICULTY_PROFILES[0];
  }, [selectedDifficulty]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    try {
      setSkin(parseInt(localStorage.getItem("flappy-bird-skin") || "0", 10));
      setPipeSkinIndex(
        parseInt(localStorage.getItem("flappy-pipe-skin") || "0", 10),
      );
      const savedDifficulty = localStorage.getItem("flappy-difficulty-profile");
      if (savedDifficulty) setSelectedDifficulty(savedDifficulty);
      const savedLeaderboard = JSON.parse(
        localStorage.getItem("flappy-leaderboard") || "[]",
      );
      if (Array.isArray(savedLeaderboard)) {
        leaderboardRef.current = savedLeaderboard;
        setLeaderboard(savedLeaderboard);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    birdImages.current = BIRD_ASSETS.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    };
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

    // mode flags
    let practiceMode = localStorage.getItem("flappy-practice") === "1";

    // gravity variants
    const GRAVITY_VARIANTS = [
      { name: "Easy", value: 0.2 },
      { name: "Normal", value: 0.4 },
      { name: "Hard", value: 0.6 },
    ];
    let gravityVariant = parseInt(
      localStorage.getItem("flappy-gravity-variant") || "1",
      10,
    );
    if (gravityVariant < 0 || gravityVariant >= GRAVITY_VARIANTS.length)
      gravityVariant = 1;

    // skins
    const birdSkins = birdImages.current;
    const pipeSkins = PIPE_SKINS;
    let birdSkin = skin;
    let pipeSkin = pipeSkinIndex;

    // hitbox preview
    let showHitbox = localStorage.getItem("flappy-hitbox") === "1";

    // physics constants
    let bird = { x: 50, y: height / 2, vy: 0 };
    let gravity = GRAVITY_VARIANTS[gravityVariant].value;
    const jump = -7;

    const pipeWidth = 40;
    const baseGap = difficultyProfile.gap.base;
    const practiceGap = 120;
    let gap = practiceMode ? practiceGap : baseGap;
    const spawnSettings = difficultyProfile.spawn;
    let pipeInterval = spawnSettings.base;
    let currentPipeSpeed = difficultyProfile.speed.start;
    const maxPipeSpeed = difficultyProfile.speed.max;
    const pipeSpeedIncrement = difficultyProfile.speed.increment;
    let nextPipeFrame = pipeInterval;

    // game state
    let pipes = [];
    let frame = 0;
    let score = 0;
    let running = true;
    let crashing = false;
    let crashTimer = 0;
    let birdAngle = 0;
    let loopId = 0;
    let highHz = localStorage.getItem("flappy-120hz") === "1";
    const isMobile =
      typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    if (isMobile) highHz = false;
    const speedScale = isMobile
      ? difficultyProfile.speed.mobileScale || 1
      : 1;
    currentPipeSpeed *= speedScale;
    const scaledPipeIncrement = pipeSpeedIncrement * speedScale;
    const scaledMaxSpeed = maxPipeSpeed * speedScale;
    let fps = highHz ? 120 : 60;

    // sky, clouds, and wind
    let skyFrame = 0;
    let skyProgress = 0;
    let cloudsBack = [];
    let cloudsFront = [];
    let gust = 0;
    let gustTimer = 0;
    let foliage = [];
    let hillsBack = [];
    let hillsFront = [];

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
      const backCount = isMobile ? 2 : 3;
      const frontCount = isMobile ? 2 : 3;
      cloudsBack = Array.from({ length: backCount }, () => makeCloud(0.2));
      cloudsFront = Array.from({ length: frontCount }, () => makeCloud(0.5));
    }

    function initHills() {
      hillsBack = Array.from({ length: 2 }, (_, i) => ({
        x: i * width,
        speed: isMobile ? 0.2 : 0.3,
      }));
      hillsFront = Array.from({ length: 2 }, (_, i) => ({
        x: i * width,
        speed: isMobile ? 0.45 : 0.6,
      }));
    }

    function drawHills() {
      ctx.fillStyle = "#228B22";
      for (const h of hillsBack) ctx.fillRect(h.x, height - 30, width, 30);
      ctx.fillStyle = "#006400";
      for (const h of hillsFront) ctx.fillRect(h.x, height - 15, width, 15);
    }

    function updateHills() {
      if (reduceMotion) return;
      for (const h of hillsBack) {
        h.x -= h.speed;
        if (h.x <= -width) h.x += width * 2;
      }
      for (const h of hillsFront) {
        h.x -= h.speed;
        if (h.x <= -width) h.x += width * 2;
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
        c.x -= c.speed + gust * 0.2;
        if (c.x < -50) c.x = width + rand() * 50;
      }
      for (const c of cloudsFront) {
        c.x -= c.speed + gust * 0.4;
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
      if (reduceMotion) {
        ctx.fillStyle = "#87CEEB";
        ctx.fillRect(0, 0, width, height);
        skyProgress = 0;
        return;
      }
      const cycle = fps * 20;
      skyProgress = (Math.sin((skyFrame / cycle) * Math.PI * 2) + 1) / 2;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, mixColor([135, 206, 235], [0, 0, 64], skyProgress));
      grad.addColorStop(1, mixColor([135, 206, 235], [0, 0, 32], skyProgress));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      skyFrame += 1;
    }

    function drawClouds() {
      for (const c of cloudsBack) drawCloud(c);
      for (const c of cloudsFront) drawCloud(c);
    }

    function drawFoliage() {
      if (reduceMotion) return;
      ctx.save();
      ctx.strokeStyle = "green";
      ctx.lineWidth = 3;
      for (const f of foliage) {
        const sway = gust * 0.5 + Math.sin((frame + f.x) / 20) * 0.2;
        const tipX = f.x + sway * f.h;
        const tipY = height - 5 - f.h;
        ctx.beginPath();
        ctx.moveTo(f.x, height - 5);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
      }
      ctx.restore();
    }

    // seeded rng
    function createRandom(seed) {
      let s = seed % 2147483647;
      if (s <= 0) s += 2147483646;
      return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    }

    let seed = Date.now();
    let rand = createRandom(seed);

    function initFoliage() {
      const count = isMobile ? 4 : 6;
      foliage = Array.from({ length: count }, () => ({
        x: rand() * width,
        h: rand() * 20 + 20,
      }));
    }

    // medals
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

    // records per gravity variant
    let records = {};
    try {
      records = JSON.parse(localStorage.getItem("flappy-records") || "{}");
    } catch {
      records = {};
    }
    let best = 0;
    let ghostRun = null;
    function getRecordKeys() {
      const gravityKey = GRAVITY_VARIANTS[gravityVariant].name;
      return {
        gravityKey,
        compoundKey: `${gravityKey}-${difficultyProfile.id}`,
      };
    }
    function loadRecord() {
      const { gravityKey, compoundKey } = getRecordKeys();
      const rec = records[compoundKey] || records[gravityKey];
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

    // replay data
    let flapFrames = [];
    let lastRun = null;
    let isReplaying = false;
    let replayFlaps = [];
    let replayIndex = 0;
    let runPositions = [];
    let ghostFrame = 0;

    function computeGap() {
      if (practiceMode) return practiceGap;
      const shrinkSteps = Math.floor(score / difficultyProfile.gap.shrinkRate);
      const shrinkAmount = shrinkSteps * difficultyProfile.gap.shrinkAmount;
      const base = Math.max(
        difficultyProfile.gap.min,
        difficultyProfile.gap.base - shrinkAmount,
      );
      const variance = difficultyProfile.gap.variance;
      const randomOffset = variance ? (rand() - 0.5) * 2 * variance : 0;
      return Math.max(difficultyProfile.gap.min, base + randomOffset);
    }

    function addPipe() {
      gap = computeGap();
      const top = rand() * (height - gap - 40) + 20;
      pipes.push({ x: width, top, bottom: top + gap });
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
      birdAngle = 0;
      flapFrames = [];
      runPositions = [];
      ghostFrame = 0;
      gravity = GRAVITY_VARIANTS[gravityVariant].value;
      gap = practiceMode ? practiceGap : baseGap;
      pipeInterval = spawnSettings.base;
      currentPipeSpeed = difficultyProfile.speed.start * speedScale;
      nextPipeFrame = pipeInterval;
      initClouds();
      initHills();
      initFoliage();
      gust = 0;
      gustTimer = 0;
      scoreRef.current = 0;
      bestRef.current = best;
    }

    function startGame(newSeed = Date.now()) {
      pausedRef.current = false;
      setPaused(false);
      reset(newSeed);
      addPipe();
      startLoop();
      if (liveRef.current) liveRef.current.textContent = "Score: 0";
    }

    function flap(record = true) {
      bird.vy = jump;
      if (record) flapFrames.push(frame);
    }

    function draw() {
      drawBackground();
      drawHills();
      drawClouds();
      drawFoliage();

      // pipes / practice gates
      const [pipeC1, pipeC2] = pipeSkins[pipeSkin % pipeSkins.length];
      const pipeColor = mixColor(pipeC1, pipeC2, skyProgress);
      ctx.fillStyle = pipeColor;
      for (const pipe of pipes) {
        if (practiceMode) ctx.globalAlpha = 0.4;
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottom, pipeWidth, height - pipe.bottom);
        // bevel
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(pipe.x, 0, 4, pipe.top);
        ctx.fillRect(pipe.x, pipe.bottom, 4, height - pipe.bottom);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(pipe.x + pipeWidth - 4, 0, 4, pipe.top);
        ctx.fillRect(
          pipe.x + pipeWidth - 4,
          pipe.bottom,
          4,
          height - pipe.bottom,
        );
        ctx.fillRect(pipe.x, pipe.top - 2, pipeWidth, 2);
        ctx.fillRect(pipe.x, pipe.bottom, pipeWidth, 2);
        ctx.fillStyle = pipeColor;
        if (showHitbox) {
          ctx.strokeStyle = "red";
          ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.top);
          ctx.strokeRect(pipe.x, pipe.bottom, pipeWidth, height - pipe.bottom);
        }
        if (practiceMode) ctx.globalAlpha = 1;
      }

      // ghost bird
      if (ghostRun && ghostFrame < ghostRun.pos.length) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "gray";
        ctx.beginPath();
        ctx.arc(bird.x, ghostRun.pos[ghostFrame], 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // bird
      const img = birdSkins[birdSkin % birdSkins.length];
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(birdAngle);
      if (img && img.complete) {
        ctx.drawImage(img, -10, -10, 20, 20);
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

      // HUD
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(5, 5, 160, 140);
      ctx.fillStyle = "#fff";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      let hudY = 20;
      const hudLine = (text) => {
        ctx.fillText(text, 10, hudY);
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
              const { compoundKey, gravityKey } = getRecordKeys();
              records[compoundKey] = {
                score: best,
                run: {
                  pos: runPositions.slice(),
                  flaps: flapFrames.slice(),
                  seed,
                },
              };
              localStorage.setItem("flappy-records", JSON.stringify(records));
              if (records[gravityKey]) delete records[gravityKey];
              ghostRun = records[compoundKey].run;
            }
            lastRun = { seed, flaps: flapFrames };
            if (!practiceMode && score > 0) {
              const gravityName = GRAVITY_VARIANTS[gravityVariant].name;
              const entry = {
                score,
                difficulty: difficultyProfile.label,
                difficultyId: difficultyProfile.id,
                gravity: gravityName,
                timestamp: Date.now(),
              };
              const updated = [...leaderboardRef.current, entry]
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
              leaderboardRef.current = updated;
              setLeaderboard(updated);
              try {
                localStorage.setItem(
                  "flappy-leaderboard",
                  JSON.stringify(updated),
                );
              } catch {
                /* ignore */
              }
            }
          }
          isReplaying = false;
          stopLoop();
          if (liveRef.current)
            liveRef.current.textContent = `Game over. Final score: ${score}`;
        }
        return;
      }

      frame += 1;

      updateWind();
      updateClouds();
      updateHills();

      if (frame >= nextPipeFrame) {
        addPipe();
        if (!practiceMode) {
          currentPipeSpeed = Math.min(
            scaledMaxSpeed,
            currentPipeSpeed + scaledPipeIncrement,
          );
        }
        pipeInterval = Math.max(
          spawnSettings.min,
          spawnSettings.base -
            Math.floor(score / spawnSettings.scoreStep) * spawnSettings.step,
        );
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

      // top/bottom collision
      if (bird.y + 10 > height || bird.y - 10 < 0) {
        crashing = true;
        crashTimer = 10;
      }

      // move pipes and track passed ones
      let passed = 0;
      for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        pipe.x -= currentPipeSpeed;

        // collision with current pipe
        if (
          !practiceMode &&
          pipe.x < bird.x + 10 &&
          pipe.x + pipeWidth > bird.x - 10 &&
          (bird.y - 10 < pipe.top || bird.y + 10 > pipe.bottom)
        ) {
          crashing = true;
          crashTimer = 10;
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
      }

      draw();
      if (ghostRun && ghostFrame < ghostRun.pos.length) {
        ghostFrame += 1;
      }
    }

    function startLoop() {
      stopLoop();
      fps = highHz ? 120 : 60;
      if (isMobile) fps = Math.min(fps, 60);
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
          pausedRef.current = false;
          setPaused(false);
        }
        return;
      }

      if (e.code === "Escape" && running) {
        pausedRef.current = true;
        setPaused(true);
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
        const { gravityKey, compoundKey } = getRecordKeys();
        delete records[compoundKey];
        delete records[gravityKey];
        localStorage.setItem("flappy-records", JSON.stringify(records));
        loadRecord();
        if (liveRef.current) liveRef.current.textContent = "Record reset";
      } else if (e.code === "KeyB") {
        birdSkin = (birdSkin + 1) % birdSkins.length;
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
        pausedRef.current = false;
        setPaused(false);
      } else if (running) {
        flap();
      } else {
        startGame();
      }
    }

    window.addEventListener("keydown", handleKey, { passive: false });
    canvas.addEventListener("mousedown", handlePointer);
    canvas.addEventListener("touchstart", handlePointer, { passive: true });

    startGame();

    return () => {
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("mousedown", handlePointer);
      canvas.removeEventListener("touchstart", handlePointer);
      stopLoop();
    };
  }, [canvasRef, started, pipeSkinIndex, skin, difficultyProfile]);

  const notifyShare = (message) => {
    if (shareTimeoutRef.current) clearTimeout(shareTimeoutRef.current);
    setShareMessage(message);
    shareTimeoutRef.current = setTimeout(() => {
      setShareMessage("");
    }, 3000);
  };

  const handleShareLeaderboard = async () => {
    if (!leaderboardRef.current.length) {
      notifyShare("Play a round to populate the leaderboard!");
      return;
    }

    const lines = leaderboardRef.current
      .map(
        (entry, index) =>
          `${index + 1}. ${entry.score} pts — ${entry.gravity} • ${entry.difficulty}`,
      )
      .join("\n");
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = origin ? `${origin}/apps/flappy-bird` : "/apps/flappy-bird";
    const text = `Flappy Bird Top Scores:\n${lines}\nPlay: ${shareUrl}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "Flappy Bird Leaderboard",
          text,
        });
        notifyShare("Leaderboard shared!");
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        await navigator.clipboard.writeText(text);
        notifyShare("Leaderboard copied to clipboard");
      } else {
        notifyShare("Sharing isn't supported in this browser");
      }
    } catch (error) {
      if (!error || error.name !== "AbortError") {
        notifyShare("Share canceled");
      }
    }
  };

  const renderLeaderboardList = (className = "") => {
    const classes = [
      "max-h-48",
      "overflow-y-auto",
      "space-y-1",
      "text-sm",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (!leaderboard.length) {
      return (
        <ol className={classes}>
          <li className="text-xs text-gray-300">No scores yet. Take flight!</li>
        </ol>
      );
    }

    return (
      <ol className={classes}>
        {leaderboard.map((entry, index) => {
          const date = new Date(entry.timestamp);
          const dateLabel = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
          return (
            <li
              key={`${entry.timestamp}-${entry.score}-${index}`}
              className="flex items-center justify-between gap-2 rounded bg-gray-800/60 px-2 py-1"
            >
              <span className="font-mono text-base">{`${index + 1}. ${entry.score}`}</span>
              <span className="text-right text-xs leading-tight text-gray-300">
                {entry.gravity} • {entry.difficulty}
                <br />
                {dateLabel}
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div className="relative w-full h-full">
      <button
        type="button"
        className="absolute top-2 right-2 z-30 rounded bg-gray-800 px-3 py-1 text-xs font-semibold text-white shadow focus:outline-none focus:ring"
        onClick={() => setLeaderboardOpen(true)}
      >
        Leaderboard
      </button>
      {leaderboardOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70 text-white">
          <div
            role="dialog"
            aria-modal="true"
            className="w-80 max-w-full rounded-lg bg-gray-900 p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Top Scores</h2>
              <button
                type="button"
                className="rounded bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring"
                onClick={() => setLeaderboardOpen(false)}
              >
                Close
              </button>
            </div>
            {renderLeaderboardList("max-h-56")}
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                type="button"
                className="flex-1 rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring"
                onClick={handleShareLeaderboard}
              >
                Share leaderboard
              </button>
            </div>
            {shareMessage && (
              <p className="mt-2 text-xs text-gray-200" aria-live="polite">
                {shareMessage}
              </p>
            )}
          </div>
        </div>
      )}
      {!started && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-black bg-opacity-70 text-white">
          <label className="flex flex-col items-center">
            Bird Skin
            <select
              className="text-black mt-1"
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
          <label className="flex flex-col items-center">
            Pipe Skin
            <select
              className="text-black mt-1"
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
          <label className="flex flex-col items-center text-center">
            Difficulty
            <select
              className="mt-1 w-40 text-black"
              value={selectedDifficulty}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedDifficulty(value);
                try {
                  localStorage.setItem("flappy-difficulty-profile", value);
                } catch {
                  /* ignore */
                }
              }}
            >
              {DIFFICULTY_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
            <span className="mt-1 max-w-xs text-xs text-gray-200">
              {difficultyProfile.description}
            </span>
          </label>
          <div className="w-72 max-w-full rounded bg-gray-900 bg-opacity-80 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide">
                Local Leaderboard
              </h3>
              <button
                type="button"
                className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-500 focus:outline-none focus:ring"
                onClick={handleShareLeaderboard}
              >
                Share
              </button>
            </div>
            {renderLeaderboardList()}
            {shareMessage && (
              <p className="mt-2 text-xs text-gray-200" aria-live="polite">
                {shareMessage}
              </p>
            )}
          </div>
          <button
            className="px-6 py-3 w-32 bg-gray-700 hover:bg-gray-600 rounded"
            onClick={() => {
              try {
                localStorage.setItem("flappy-bird-skin", String(skin));
                localStorage.setItem("flappy-pipe-skin", String(pipeSkinIndex));
                localStorage.setItem(
                  "flappy-difficulty-profile",
                  selectedDifficulty,
                );
              } catch {
                /* ignore */
              }
              setLeaderboardOpen(false);
              setStarted(true);
            }}
          >
            Start
          </button>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-black"
        role="img"
        aria-label="Flappy Bird game"
      />
      {paused && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black bg-opacity-50 text-white"
          onClick={() => {
            pausedRef.current = false;
            setPaused(false);
          }}
          onTouchStart={() => {
            pausedRef.current = false;
            setPaused(false);
          }}
        >
          <div className="mb-4 text-center">
            <p>Score: {scoreRef.current}</p>
            <p>Best: {bestRef.current}</p>
          </div>
          <button className="px-6 py-3 w-32 bg-gray-700 rounded">Resume</button>
        </div>
      )}
      <div ref={liveRef} className="sr-only" aria-live="polite" />
    </div>
  );
};

export default FlappyBird;
