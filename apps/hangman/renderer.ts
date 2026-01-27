import { getMaskedWord, HangmanState } from './model';

const BASE_WIDTH = 420;
const BASE_HEIGHT = 260;

const BG_COLOR = '#0b0f16';
const STROKE_COLOR = '#cbd5e1';
const TEXT_COLOR = '#e2e8f0';
const MUTED_TEXT = '#94a3b8';
const SUCCESS_COLOR = '#22c55e';
const FAILURE_COLOR = '#ef4444';

const PARTS = [
  (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(300, 90, 18, 0, Math.PI * 2);
    ctx.stroke();
  },
  (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(300, 108);
    ctx.lineTo(300, 160);
    ctx.stroke();
  },
  (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(300, 120);
    ctx.lineTo(275, 140);
    ctx.stroke();
  },
  (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(300, 120);
    ctx.lineTo(325, 140);
    ctx.stroke();
  },
  (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(300, 160);
    ctx.lineTo(282, 195);
    ctx.stroke();
  },
  (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.moveTo(300, 160);
    ctx.lineTo(318, 195);
    ctx.stroke();
  },
];

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

export interface HangmanRendererSnapshot {
  game: HangmanState;
  paused: boolean;
}

export const createHangmanRenderer = ({
  canvas,
  getSnapshot,
  prefersReducedMotion,
}: {
  canvas: HTMLCanvasElement;
  getSnapshot: () => HangmanRendererSnapshot;
  prefersReducedMotion: () => boolean;
}) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let raf = 0;
  let cancelled = false;
  let lastWord = '';
  let lastWrong = 0;
  let wrongChangedAt = performance.now();
  let gameStartAt = performance.now();

  const drawLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    progress: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + (x2 - x1) * progress, y1 + (y2 - y1) * progress);
    ctx.stroke();
  };

  const render = (t: number) => {
    if (cancelled) return;

    const { game, paused } = getSnapshot();
    if (game.word !== lastWord) {
      lastWord = game.word;
      lastWrong = game.wrong;
      gameStartAt = t;
      wrongChangedAt = t;
    }
    if (game.wrong !== lastWrong) {
      lastWrong = game.wrong;
      wrongChangedAt = t;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
    const offsetX = (width - BASE_WIDTH * scale) / 2;
    const offsetY = (height - BASE_HEIGHT * scale) / 2;

    ctx.setTransform(
      dpr * scale,
      0,
      0,
      dpr * scale,
      offsetX * dpr,
      offsetY * dpr,
    );

    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const elapsed = (t - gameStartAt) / 1000;
    const partElapsed = (t - wrongChangedAt) / 1000;
    const gallowsProgress = prefersReducedMotion()
      ? 1
      : clamp(elapsed / 0.55, 0, 1);
    drawLine(100, 220, 250, 220, gallowsProgress);
    drawLine(150, 220, 150, 40, gallowsProgress);
    drawLine(150, 40, 300, 40, gallowsProgress);
    drawLine(300, 40, 300, 70, gallowsProgress);

    const shown = clamp(game.wrong, 0, PARTS.length);
    for (let i = 0; i < shown; i += 1) {
      const isLatest = i === shown - 1;
      const p = prefersReducedMotion()
        ? 1
        : clamp((isLatest ? partElapsed : 1) / 0.25, 0, 1);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.setLineDash(prefersReducedMotion() || !isLatest ? [] : [8, 10]);
      PARTS[i](ctx);
      ctx.restore();
    }

    if (game.word) {
      const masked = getMaskedWord(game);
      const padX = 24;
      const usable = BASE_WIDTH - padX * 2;
      const len = masked.length || 1;
      const spacing = clamp(usable / len, 18, 34);
      const startX = (BASE_WIDTH - spacing * len) / 2 + spacing / 2;

      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < len; i += 1) {
        const x = startX + i * spacing;
        const y = 235;
        const char = masked[i];
        const show = char !== '_';
        ctx.fillStyle = show ? TEXT_COLOR : MUTED_TEXT;
        ctx.fillText(show ? char : '_', x, y);
      }
    }

    if (paused && game.status === 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', BASE_WIDTH / 2, BASE_HEIGHT / 2);
    }

    if (game.status === 'won' || game.status === 'lost') {
      ctx.fillStyle =
        game.status === 'won'
          ? 'rgba(34,197,94,0.25)'
          : 'rgba(239,68,68,0.25)';
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
      ctx.fillStyle = game.status === 'won' ? SUCCESS_COLOR : FAILURE_COLOR;
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        game.status === 'won' ? 'YOU WIN' : 'GAME OVER',
        BASE_WIDTH / 2,
        36,
      );
    }

    raf = requestAnimationFrame(render);
  };

  raf = requestAnimationFrame(render);
  return () => {
    cancelled = true;
    if (raf) cancelAnimationFrame(raf);
  };
};
