import type { FlappyPipe, FlappyState } from './engine';
import { pipeExtents, PIPE_WIDTH, createRandom } from './engine';
import type { RGB } from './skins';

interface Cloud {
  x: number;
  y: number;
  speed: number;
  scale: number;
}

interface Skyline {
  x: number;
  speed: number;
  peaks: number[];
}

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  twinkle: number;
}

interface Foliage {
  x: number;
  h: number;
}

interface GroundTile {
  x: number;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface FlappyRenderState {
  skyFrame: number;
  skyProgress: number;
  cloudsBack: Cloud[];
  cloudsFront: Cloud[];
  gust: number;
  gustTimer: number;
  foliage: Foliage[];
  skylineBack: Skyline[];
  skylineFront: Skyline[];
  starfield: Star[];
  groundTiles: GroundTile[];
  particles: Particle[];
  frame: number;
}

export interface FlappyRenderOptions {
  width: number;
  height: number;
  pipeSkins: [RGB, RGB][];
  birdFrames: HTMLImageElement[][];
  birdSkinIndex: number;
  pipeSkinIndex: number;
  showHitbox: boolean;
  showGhost: boolean;
  ghostRun: { pos: number[] } | null;
  reducedMotion: boolean;
  practiceMode: boolean;
}

export interface FlappyRenderer {
  reset: (seed: number, reducedMotion: boolean) => void;
  update: (reducedMotion: boolean) => void;
  render: (
    ctx: CanvasRenderingContext2D,
    state: FlappyState,
    options: FlappyRenderOptions,
  ) => void;
  spawnParticles: (
    x: number,
    y: number,
    color: string,
    count?: number,
    speed?: number,
  ) => void;
}

const mixColor = (c1: RGB, c2: RGB, t: number) =>
  `rgb(${Math.round(c1[0] + (c2[0] - c1[0]) * t)},${Math.round(
    c1[1] + (c2[1] - c1[1]) * t,
  )},${Math.round(c1[2] + (c2[2] - c1[2]) * t)})`;

export function createFlappyRenderer(width: number, height: number): FlappyRenderer {
  const renderState: FlappyRenderState = {
    skyFrame: 0,
    skyProgress: 0,
    cloudsBack: [],
    cloudsFront: [],
    gust: 0,
    gustTimer: 0,
    foliage: [],
    skylineBack: [],
    skylineFront: [],
    starfield: [],
    groundTiles: [],
    particles: [],
    frame: 0,
  };

  let rand = createRandom(Date.now());

  const makeCloud = (speed: number): Cloud => ({
    x: rand() * width,
    y: rand() * (height / 2),
    speed,
    scale: rand() * 0.5 + 0.5,
  });

  const createPeakSet = (count: number, minHeight: number, maxHeight: number) =>
    Array.from({ length: count }, () => minHeight + rand() * (maxHeight - minHeight));

  const initClouds = () => {
    renderState.cloudsBack = Array.from({ length: 3 }, () => makeCloud(0.2));
    renderState.cloudsFront = Array.from({ length: 3 }, () => makeCloud(0.5));
  };

  const initSkyline = (reducedMotion: boolean) => {
    const tilesNeeded = Math.ceil(width / 24) + 2;
    renderState.skylineBack = Array.from({ length: 2 }, (_, i) => ({
      x: i * width,
      speed: reducedMotion ? 0 : 0.2,
      peaks: createPeakSet(6, height * 0.25, height * 0.45),
    }));
    renderState.skylineFront = Array.from({ length: 2 }, (_, i) => ({
      x: i * width,
      speed: reducedMotion ? 0 : 0.45,
      peaks: createPeakSet(6, height * 0.4, height * 0.6),
    }));
    renderState.groundTiles = Array.from({ length: tilesNeeded }, (_, i) => ({
      x: i * 24,
      speed: 1.2,
    }));
  };

  const initStarfield = (reducedMotion: boolean) => {
    renderState.starfield = reducedMotion
      ? []
      : Array.from({ length: 24 }, () => ({
          x: rand() * width,
          y: rand() * height * 0.4,
          speed: 0.1 + rand() * 0.1,
          size: rand() * 1.2 + 0.6,
          twinkle: rand() * Math.PI * 2,
        }));
  };

  const initFoliage = () => {
    renderState.foliage = Array.from({ length: 6 }, () => ({
      x: rand() * width,
      h: rand() * 24 + 20,
    }));
  };

  const initDecor = (reducedMotion: boolean) => {
    initClouds();
    initSkyline(reducedMotion);
    initStarfield(reducedMotion);
    initFoliage();
  };

  const updateWind = (reducedMotion: boolean) => {
    if (reducedMotion) {
      renderState.gust = 0;
      renderState.gustTimer = 0;
      return;
    }
    if (renderState.gustTimer > 0) {
      renderState.gustTimer -= 1;
      if (renderState.gustTimer <= 0) renderState.gust = 0;
    } else if (rand() < 0.005) {
      renderState.gust = (rand() - 0.5) * 2;
      renderState.gustTimer = 60;
    }
  };

  const updateClouds = (reducedMotion: boolean) => {
    if (reducedMotion) return;
    for (const cloud of renderState.cloudsBack) {
      cloud.x -= cloud.speed + renderState.gust * 0.15;
      if (cloud.x < -50) cloud.x = width + rand() * 50;
    }
    for (const cloud of renderState.cloudsFront) {
      cloud.x -= cloud.speed + renderState.gust * 0.3;
      if (cloud.x < -50) cloud.x = width + rand() * 50;
    }
  };

  const updateSkyline = (reducedMotion: boolean, layer: Skyline[]) => {
    if (reducedMotion) return;
    for (const skyline of layer) {
      skyline.x -= skyline.speed;
      if (skyline.x <= -width) skyline.x += width * layer.length;
    }
  };

  const updateStarfield = () => {
    if (!renderState.starfield.length) return;
    for (const star of renderState.starfield) {
      star.x -= star.speed;
      star.twinkle += 0.04;
      if (star.x < -2) {
        star.x = width + rand() * 20;
        star.y = rand() * height * 0.4;
      }
    }
  };

  const updateGround = (reducedMotion: boolean) => {
    if (reducedMotion) return;
    for (const tile of renderState.groundTiles) {
      tile.x -= tile.speed;
      if (tile.x <= -24) tile.x += 24 * renderState.groundTiles.length;
    }
  };

  const updateParticles = () => {
    if (!renderState.particles.length) return;
    for (let i = renderState.particles.length - 1; i >= 0; i -= 1) {
      const p = renderState.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life -= 1;
      if (p.life <= 0) {
        renderState.particles.splice(i, 1);
      }
    }
  };

  const drawCloud = (ctx: CanvasRenderingContext2D, cloud: Cloud) => {
    const drawEllipse = (
      x: number,
      y: number,
      rx: number,
      ry: number,
      rotation: number,
    ) => {
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
        return;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.scale(rx, ry);
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.restore();
    };
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    drawEllipse(cloud.x, cloud.y, 20 * cloud.scale, 12 * cloud.scale, 0);
    drawEllipse(
      cloud.x + 15 * cloud.scale,
      cloud.y + 2 * cloud.scale,
      20 * cloud.scale,
      12 * cloud.scale,
      0,
    );
    drawEllipse(
      cloud.x - 15 * cloud.scale,
      cloud.y + 2 * cloud.scale,
      20 * cloud.scale,
      12 * cloud.scale,
      0,
    );
    ctx.fill();
    ctx.restore();
  };

  const drawSkylineLayer = (
    ctx: CanvasRenderingContext2D,
    layer: Skyline[],
    color: string,
    alpha: number,
  ) => {
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
  };

  const drawStarfield = (ctx: CanvasRenderingContext2D) => {
    if (!renderState.starfield.length) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const star of renderState.starfield) {
      const alpha = 0.5 + Math.sin(star.twinkle) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawGround = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    const groundY = height - 10;
    ctx.fillStyle = '#2f1c0d';
    ctx.fillRect(0, groundY, width, 10);
    ctx.fillStyle = '#3b2815';
    for (const tile of renderState.groundTiles) {
      ctx.fillRect(tile.x, groundY - 3, 20, 3);
    }
    ctx.restore();
  };

  const drawFoliage = (ctx: CanvasRenderingContext2D, reducedMotion: boolean) => {
    if (reducedMotion) return;
    ctx.save();
    ctx.strokeStyle = '#2c5f2d';
    ctx.lineWidth = 3;
    for (const f of renderState.foliage) {
      const sway = renderState.gust * 0.5 + Math.sin((renderState.frame + f.x) / 18) * 0.3;
      const tipX = f.x + sway * f.h;
      const tipY = height - 12 - f.h;
      ctx.beginPath();
      ctx.moveTo(f.x, height - 12);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    if (!renderState.particles.length) return;
    ctx.save();
    for (const p of renderState.particles) {
      ctx.globalAlpha = Math.max(p.life / 45, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const spawnParticles = (x: number, y: number, color: string, count = 14, speed = 2) => {
    for (let i = 0; i < count; i += 1) {
      renderState.particles.push({
        x,
        y,
        vx: (rand() - 0.5) * speed * 2,
        vy: (rand() - 0.2) * speed * 1.5,
        life: 30 + rand() * 15,
        color,
      });
    }
  };

  const drawPipes = (
    ctx: CanvasRenderingContext2D,
    pipes: FlappyPipe[],
    frame: number,
    options: FlappyRenderOptions,
  ) => {
    const [pipeC1, pipeC2] = options.pipeSkins[options.pipeSkinIndex % options.pipeSkins.length];
    const pipeColor = mixColor(pipeC1, pipeC2, renderState.skyProgress);
    ctx.fillStyle = pipeColor;
    for (const pipe of pipes) {
      const { top, bottom } = pipeExtents(pipe, frame, height, options.reducedMotion);
      if (options.practiceMode) ctx.globalAlpha = 0.4;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, top);
      ctx.fillRect(pipe.x, bottom, PIPE_WIDTH, height - bottom);
      const glowStrength = options.reducedMotion
        ? 0.2
        : (Math.sin(statePipeGlowPhase(frame, pipe.x)) + 1) / 2;
      const bevel = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      bevel.addColorStop(0, `rgba(255,255,255,${0.2 + glowStrength * 0.1})`);
      bevel.addColorStop(1, `rgba(0,0,0,${0.4 - glowStrength * 0.1})`);
      ctx.fillStyle = bevel;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, top);
      ctx.fillRect(pipe.x, bottom, PIPE_WIDTH, height - bottom);
      ctx.fillStyle = pipeColor;
      ctx.fillRect(pipe.x, top - 2, PIPE_WIDTH, 2);
      ctx.fillRect(pipe.x, bottom, PIPE_WIDTH, 2);
      if (options.showHitbox) {
        ctx.strokeStyle = 'red';
        ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, top);
        ctx.strokeRect(pipe.x, bottom, PIPE_WIDTH, height - bottom);
      }
      if (options.practiceMode) ctx.globalAlpha = 1;
    }
  };

  const statePipeGlowPhase = (frame: number, pipeX: number) =>
    renderState.frame * 0.05 + pipeX / 40;

  return {
    reset(seed: number, reducedMotion: boolean) {
      rand = createRandom(seed);
      renderState.skyFrame = 0;
      renderState.skyProgress = 0;
      renderState.gust = 0;
      renderState.gustTimer = 0;
      renderState.particles = [];
      renderState.frame = 0;
      initDecor(reducedMotion);
    },
    update(reducedMotion: boolean) {
      renderState.frame += 1;
      updateWind(reducedMotion);
      updateClouds(reducedMotion);
      updateSkyline(reducedMotion, renderState.skylineBack);
      updateSkyline(reducedMotion, renderState.skylineFront);
      updateStarfield();
      updateGround(reducedMotion);
      updateParticles();
    },
    render(ctx, state, options) {
      const cycle = 20 * 60;
      renderState.skyProgress =
        (Math.sin((renderState.skyFrame / cycle) * Math.PI * 2) + 1) / 2;
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, mixColor([135, 206, 235], [24, 32, 72], renderState.skyProgress));
      grad.addColorStop(
        1,
        mixColor([135, 206, 235], [16, 22, 48], renderState.skyProgress),
      );
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      drawStarfield(ctx);
      renderState.skyFrame += 1;

      drawSkylineLayer(ctx, renderState.skylineBack, '#18324a', 0.6);
      drawSkylineLayer(ctx, renderState.skylineFront, '#234c63', 0.85);
      for (const cloud of renderState.cloudsBack) drawCloud(ctx, cloud);
      for (const cloud of renderState.cloudsFront) drawCloud(ctx, cloud);
      drawGround(ctx);
      drawFoliage(ctx, options.reducedMotion);

      drawPipes(ctx, state.pipes, state.frame, options);
      drawParticles(ctx);

      if (options.showGhost && options.ghostRun && state.frame < options.ghostRun.pos.length) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'gray';
        ctx.beginPath();
        ctx.arc(state.bird.x, options.ghostRun.pos[state.frame], 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const frames = options.birdFrames[options.birdSkinIndex % options.birdFrames.length] || [];
      const frameIndex = frames.length ? Math.floor(state.frame / 6) % frames.length : 0;
      const img = frames[frameIndex];
      ctx.save();
      ctx.translate(state.bird.x, state.bird.y);
      ctx.rotate(state.birdAngle);
      if (img && img.complete) {
        ctx.drawImage(img, -12, -10, 24, 20);
      } else {
        ctx.fillStyle = 'yellow';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      if (options.showHitbox) {
        ctx.strokeStyle = 'red';
        ctx.strokeRect(-10, -10, 20, 20);
      }
      ctx.restore();
    },
    spawnParticles,
  };
}
