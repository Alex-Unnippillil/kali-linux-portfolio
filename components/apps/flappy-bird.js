import React, { useCallback, useEffect, useRef, useState } from "react";
import useCanvasResize from "../../hooks/useCanvasResize";
import {
  BIRD_SKINS,
  BIRD_ANIMATION_FRAMES,
  PIPE_SKINS,
} from "../../apps/games/flappy-bird/skins";
import { consumeGameKey, shouldHandleGameKey } from "../../utils/gameInput";

const WIDTH = 400;
const HEIGHT = 300;
const GRAVITY_VARIANTS = [
  { name: "Easy", value: 0.2 },
  { name: "Normal", value: 0.4 },
  { name: "Hard", value: 0.6 },
];
const STORAGE_KEYS = {
  birdSkin: "flappy-bird-skin",
  pipeSkin: "flappy-pipe-skin",
  gravity: "flappy-gravity-variant",
  practice: "flappy-practice",
  ghost: "flappy-ghost",
  reducedMotion: "flappy-reduced-motion",
  highHz: "flappy-120hz",
  hitbox: "flappy-hitbox",
};

const readStorageValue = (key) => {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const readStorageNumber = (key, fallback, { min = 0, max = Infinity } = {}) => {
  const raw = readStorageValue(key);
  const parsed = raw === null ? NaN : Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min || parsed > max) return fallback;
  return parsed;
};

const readStorageBoolean = (key, fallback) => {
  const raw = readStorageValue(key);
  if (raw === null) return fallback;
  return raw === "1" || raw === "true";
};

const writeStorageValue = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

const getPrefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const FlappyBird = ({ windowMeta } = {}) => {
  const isWindowFocused = windowMeta?.isFocused ?? true;
  const canvasRef = useCanvasResize(WIDTH, HEIGHT);
  const containerRef = useRef(null);
  const liveRef = useRef(null);
  const keyHandlerRef = useRef(null);
  const applySettingsRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [gameState, setGameState] = useState("menu");
  const [skin, setSkin] = useState(0);
  const [pipeSkinIndex, setPipeSkinIndex] = useState(0);
  const birdImages = useRef([]);
  const birdFrames = useRef([]);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
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
  const [isFocused, setIsFocused] = useState(false);
  const focusPausedRef = useRef(false);
  const [settings, setSettings] = useState({
    gravityVariant: 1,
    practiceMode: false,
    showGhost: true,
    reducedMotion: false,
    highHz: false,
    showHitbox: false,
  });
  const settingsRef = useRef(settings);

  const announce = useCallback((message) => {
    if (liveRef.current) {
      liveRef.current.textContent = message;
    }
  }, []);

  const focusCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    requestAnimationFrame(() => {
      canvas.focus();
    });
  }, [canvasRef]);

  const resumeGame = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    setGameState("running");
    focusCanvas();
  }, [focusCanvas]);

  const pauseGame = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
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
    const maxGravityIndex = GRAVITY_VARIANTS.length - 1;
    setSkin(readStorageNumber(STORAGE_KEYS.birdSkin, 0, { min: 0 }));
    setPipeSkinIndex(readStorageNumber(STORAGE_KEYS.pipeSkin, 0, { min: 0 }));
    setSettings((current) => ({
      ...current,
      gravityVariant: readStorageNumber(STORAGE_KEYS.gravity, 1, {
        min: 0,
        max: maxGravityIndex,
      }),
      practiceMode: readStorageBoolean(STORAGE_KEYS.practice, false),
      showGhost: readStorageBoolean(STORAGE_KEYS.ghost, true),
      reducedMotion: readStorageBoolean(
        STORAGE_KEYS.reducedMotion,
        getPrefersReducedMotion(),
      ),
      highHz: readStorageBoolean(STORAGE_KEYS.highHz, false),
      showHitbox: readStorageBoolean(STORAGE_KEYS.hitbox, false),
    }));
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
    settingsRef.current = settings;
    if (applySettingsRef.current) {
      applySettingsRef.current(settings);
    }
  }, [settings]);

  useEffect(() => {
    writeStorageValue(STORAGE_KEYS.birdSkin, String(skin));
  }, [skin]);

  useEffect(() => {
    writeStorageValue(STORAGE_KEYS.pipeSkin, String(pipeSkinIndex));
  }, [pipeSkinIndex]);

  useEffect(() => {
    writeStorageValue(STORAGE_KEYS.gravity, String(settings.gravityVariant));
  }, [settings.gravityVariant]);

  useEffect(() => {
    writeStorageValue(STORAGE_KEYS.practice, settings.practiceMode ? "1" : "0");
  }, [settings.practiceMode]);

  useEffect(() => {
    writeStorageValue(STORAGE_KEYS.ghost, settings.showGhost ? "1" : "0");
  }, [settings.showGhost]);

  useEffect(() => {
    writeStorageValue(
      STORAGE_KEYS.reducedMotion,
      settings.reducedMotion ? "1" : "0",
    );
  }, [settings.reducedMotion]);

  useEffect(() => {
    writeStorageValue(STORAGE_KEYS.highHz, settings.highHz ? "1" : "0");
  }, [settings.highHz]);

  useEffect(() => {
    writeStorageValue(STORAGE_KEYS.hitbox, settings.showHitbox ? "1" : "0");
  }, [settings.showHitbox]);

  useEffect(() => {
    if (!started) return;
    const handleVisibility = () => {
      if (document.hidden && gameState === "running") {
        pauseGame();
      }
    };
    const handleBlur = () => {
      if (gameState === "running") {
        pauseGame();
      }
    };
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [gameState, pauseGame, started]);

  const updateSetting = useCallback(
    (key, value, message) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      if (message) announce(message);
    },
    [announce],
  );

  const handleFocusCapture = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlurCapture = useCallback(() => {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement;
      if (
        containerRef.current &&
        activeElement instanceof HTMLElement &&
        !containerRef.current.contains(activeElement)
      ) {
        setIsFocused(false);
      }
    });
  }, []);

  const handleRootKeyDown = useCallback(
    (event) => {
      if (!isWindowFocused) return;
      if (!keyHandlerRef.current) return;
      if (document.activeElement !== canvasRef.current) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["input", "textarea", "select", "option"].includes(
            target.tagName.toLowerCase(),
          ))
      ) {
        return;
      }
      if (!shouldHandleGameKey(event, { isFocused: isFocused && isWindowFocused })) return;
      consumeGameKey(event);
      keyHandlerRef.current(event);
    },
    [canvasRef, isFocused, isWindowFocused],
  );

  useEffect(() => {
    if (started) {
      focusCanvas();
    }
  }, [focusCanvas, started]);

  useEffect(() => {
    if (!isWindowFocused && gameState === "running") {
      focusPausedRef.current = true;
      pauseGame();
      return;
    }
    if (isWindowFocused && focusPausedRef.current && gameState === "paused") {
      focusPausedRef.current = false;
      resumeGame();
    }
  }, [gameState, isWindowFocused, pauseGame, resumeGame]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = WIDTH;
    const height = HEIGHT;
    let reduceMotion = settingsRef.current.reducedMotion;
    let practiceMode = settingsRef.current.practiceMode;
    let gravityVariant = settingsRef.current.gravityVariant;

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

    let showHitbox = settingsRef.current.showHitbox;

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
    let showGhost = settingsRef.current.showGhost;
    let highHz = settingsRef.current.highHz;
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

      if (showGhost && ghostRun && ghostFrame < ghostRun.pos.length) {
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
      if (showGhost && ghostRun && ghostFrame < ghostRun.pos.length) {
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

    function applySettings(nextSettings) {
      const nextGravity = Math.min(
        GRAVITY_VARIANTS.length - 1,
        Math.max(0, Number(nextSettings.gravityVariant)),
      );
      if (nextGravity !== gravityVariant) {
        gravityVariant = nextGravity;
        gravity = GRAVITY_VARIANTS[gravityVariant].value;
        loadRecord();
        ghostFrame = 0;
      }
      if (nextSettings.practiceMode !== practiceMode) {
        practiceMode = nextSettings.practiceMode;
        gap = practiceMode ? practiceGap : baseGap;
        if (running) startLoop();
      }
      if (nextSettings.reducedMotion !== reduceMotion) {
        reduceMotion = nextSettings.reducedMotion;
        initDecor();
      }
      if (nextSettings.highHz !== highHz) {
        highHz = nextSettings.highHz;
        if (running) startLoop();
      }
      if (nextSettings.showHitbox !== showHitbox) {
        showHitbox = nextSettings.showHitbox;
      }
      if (nextSettings.showGhost !== showGhost) {
        showGhost = nextSettings.showGhost;
        ghostFrame = 0;
      }
    }

    function handleKey(e) {
      if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown"
      ) {
        e.preventDefault();
      }
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
        updateSetting(
          "highHz",
          !settingsRef.current.highHz,
          `120 Hz ${settingsRef.current.highHz ? "off" : "on"}`,
        );
      } else if (e.code === "KeyM") {
        updateSetting(
          "reducedMotion",
          !settingsRef.current.reducedMotion,
          `Reduced motion ${settingsRef.current.reducedMotion ? "off" : "on"}`,
        );
      } else if (e.code === "KeyP") {
        updateSetting(
          "practiceMode",
          !settingsRef.current.practiceMode,
          settingsRef.current.practiceMode ? "Practice mode off" : "Practice mode on",
        );
      } else if (e.code === "KeyT") {
        updateSetting(
          "showGhost",
          !settingsRef.current.showGhost,
          settingsRef.current.showGhost ? "Ghost off" : "Ghost on",
        );
      } else if (e.code === "KeyG" && !running) {
        const nextGravity =
          (settingsRef.current.gravityVariant + 1) % GRAVITY_VARIANTS.length;
        updateSetting(
          "gravityVariant",
          nextGravity,
          `Difficulty: ${GRAVITY_VARIANTS[nextGravity].name}`,
        );
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
        if (liveRef.current)
          liveRef.current.textContent = `Bird skin ${birdSkin + 1}`;
      } else if (e.code === "KeyO") {
        pipeSkin = (pipeSkin + 1) % pipeSkins.length;
        setPipeSkinIndex(pipeSkin);
        if (liveRef.current)
          liveRef.current.textContent = `Pipe skin ${pipeSkin + 1}`;
      } else if (e.code === "KeyH") {
        updateSetting(
          "showHitbox",
          !settingsRef.current.showHitbox,
          settingsRef.current.showHitbox ? "Hitbox off" : "Hitbox on",
        );
      }
    }

    function handlePointer() {
      focusCanvas();
      if (pausedRef.current) {
        resumeGame();
      } else if (running) {
        flap();
      } else {
        startGame();
      }
    }

    applySettingsRef.current = applySettings;
    keyHandlerRef.current = handleKey;
    startGameRef.current = startGame;

    canvas.addEventListener("mousedown", handlePointer);
    canvas.addEventListener("touchstart", handlePointer, { passive: true });

    startGame();

    return () => {
      startGameRef.current = null;
      keyHandlerRef.current = null;
      applySettingsRef.current = null;
      canvas.removeEventListener("mousedown", handlePointer);
      canvas.removeEventListener("touchstart", handlePointer);
      stopLoop();
    };
  }, [
    canvasRef,
    started,
    pipeSkinIndex,
    skin,
    pauseGame,
    resumeGame,
    syncLeaderboard,
    updateSetting,
    focusCanvas,
  ]);

  const leaderboardItems = leaderboard.slice(0, 5);
  const settingsHelp = [
    "Space / tap to flap",
    "Esc to pause or resume",
    "R to replay last, Shift+R for best (game over)",
    "B for bird skin, O for pipe skin",
    "G cycles difficulty (game over)",
    "T ghost toggle · M reduced motion · P practice",
    "F 120 Hz toggle · H hitbox",
  ];

  const SettingsPanel = ({ heading }) => (
    <div className="rounded-lg bg-white/10 p-4 backdrop-blur">
      {heading && <h3 className="text-lg font-semibold">{heading}</h3>}
      <div className="mt-3 space-y-3 text-sm text-white/90">
        <label className="flex flex-col text-sm">
          <span className="text-xs uppercase tracking-widest text-white/60">Difficulty</span>
          <select
            className="mt-1 rounded border border-white/20 bg-white/90 px-3 py-2 text-black"
            value={settings.gravityVariant}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              updateSetting(
                "gravityVariant",
                next,
                `Difficulty: ${GRAVITY_VARIANTS[next].name}`,
              );
            }}
          >
            {GRAVITY_VARIANTS.map((variant, index) => (
              <option key={variant.name} value={index}>
                {variant.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Practice mode</span>
            <span className="block text-xs text-white/60">
              Wider gaps with collision relaxed.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Practice mode"
            checked={settings.practiceMode}
            onChange={(e) =>
              updateSetting(
                "practiceMode",
                e.target.checked,
                e.target.checked ? "Practice mode on" : "Practice mode off",
              )
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Ghost run</span>
            <span className="block text-xs text-white/60">
              Show the best run overlay.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Ghost run"
            checked={settings.showGhost}
            onChange={(e) =>
              updateSetting(
                "showGhost",
                e.target.checked,
                e.target.checked ? "Ghost on" : "Ghost off",
              )
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Reduced motion</span>
            <span className="block text-xs text-white/60">
              Calms background animation.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Reduced motion"
            checked={settings.reducedMotion}
            onChange={(e) =>
              updateSetting(
                "reducedMotion",
                e.target.checked,
                e.target.checked ? "Reduced motion on" : "Reduced motion off",
              )
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">120 Hz mode</span>
            <span className="block text-xs text-white/60">
              Higher refresh for smoother play.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="120 Hz mode"
            checked={settings.highHz}
            onChange={(e) =>
              updateSetting(
                "highHz",
                e.target.checked,
                e.target.checked ? "120 Hz on" : "120 Hz off",
              )
            }
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="font-semibold">Hitbox overlay</span>
            <span className="block text-xs text-white/60">
              Draw collision bounds.
            </span>
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/40 bg-white/80 text-sky-500 focus:ring-sky-400"
            aria-label="Hitbox overlay"
            checked={settings.showHitbox}
            onChange={(e) =>
              updateSetting(
                "showHitbox",
                e.target.checked,
                e.target.checked ? "Hitbox on" : "Hitbox off",
              )
            }
          />
        </label>
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full"
      onKeyDown={handleRootKeyDown}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
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
        className={`h-full w-full touch-none bg-black focus:outline-none focus:ring-2 focus:ring-sky-400 ${isFocused ? "ring-2 ring-sky-400" : ""}`}
        role="img"
        aria-label="Flappy Bird game"
        tabIndex={0}
      />

      {gameState === "menu" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-6 bg-black/80 p-6 text-white transition-opacity duration-300">
          <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
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
              <SettingsPanel heading="Settings" />
              <div className="rounded-lg bg-white/10 p-4 text-xs uppercase tracking-widest text-white/70">
                <p className="text-white">How to play</p>
                <ul className="mt-2 space-y-1 text-[11px] uppercase tracking-widest text-white/70">
                  {settingsHelp.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-white/60">
                  Click the game area to focus before using keys.
                </p>
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
              resumeGame();
              setStarted(true);
            }}
          >
            Start
          </button>
        </div>
      )}

      {gameState === "paused" && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center space-y-4 bg-black/60 p-6 text-white transition-opacity duration-300">
          <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-white/10 px-6 py-4 text-center shadow-lg backdrop-blur">
              <h3 className="text-2xl font-semibold">Paused</h3>
              <p className="mt-2 text-sm text-white/80">Score: {scoreRef.current}</p>
              <p className="text-sm text-white/60">Best this mode: {bestRef.current}</p>
              <button
                className="mt-4 w-full rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-white shadow hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-300"
                onClick={resumeGame}
              >
                Resume
              </button>
            </div>
            <SettingsPanel heading="Settings" />
          </div>
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

export default FlappyBird;
