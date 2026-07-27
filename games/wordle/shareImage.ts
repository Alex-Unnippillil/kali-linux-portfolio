import type { GuessEntry, LetterResult } from './logic';

type RGBA = [number, number, number, number];

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoardLayout extends Rect {
  cellSize: number;
  gap: number;
}

export interface WordleShareLayout {
  width: number;
  height: number;
  card: Rect;
  header: Rect;
  board: BoardLayout;
  footer: Rect;
}

const CONFIG = {
  rows: 6,
  cols: 5,
  cellSize: 64,
  gap: 12,
  cardMargin: 24,
  contentPadding: 32,
  headerHeight: 96,
  boardSpacing: 32,
  footerHeight: 88,
} as const;

const gridWidth =
  CONFIG.cols * CONFIG.cellSize + (CONFIG.cols - 1) * CONFIG.gap;
const gridHeight =
  CONFIG.rows * CONFIG.cellSize + (CONFIG.rows - 1) * CONFIG.gap;

const cardWidth = gridWidth + CONFIG.contentPadding * 2;
const cardHeight =
  CONFIG.headerHeight + CONFIG.boardSpacing + gridHeight + CONFIG.footerHeight;

const width = cardWidth + CONFIG.cardMargin * 2;
const height = cardHeight + CONFIG.cardMargin * 2;

export const WORDLE_SHARE_LAYOUT: WordleShareLayout = {
  width,
  height,
  card: {
    x: CONFIG.cardMargin,
    y: CONFIG.cardMargin,
    width: cardWidth,
    height: cardHeight,
  },
  header: {
    x: CONFIG.cardMargin,
    y: CONFIG.cardMargin,
    width: cardWidth,
    height: CONFIG.headerHeight,
  },
  board: {
    x: CONFIG.cardMargin + CONFIG.contentPadding,
    y: CONFIG.cardMargin + CONFIG.headerHeight + CONFIG.boardSpacing,
    width: gridWidth,
    height: gridHeight,
    cellSize: CONFIG.cellSize,
    gap: CONFIG.gap,
  },
  footer: {
    x: CONFIG.cardMargin,
    y:
      CONFIG.cardMargin +
      CONFIG.headerHeight +
      CONFIG.boardSpacing +
      gridHeight,
    width: cardWidth,
    height: CONFIG.footerHeight,
  },
};

const palette = {
  outer: hexToRgba('#0f1317'),
  card: hexToRgba('#111827'),
  header: hexToRgba('#1f2937'),
  boardBackground: hexToRgba('#1f2937'),
  border: hexToRgba('#374151'),
  empty: hexToRgba('#111827'),
  correct: hexToRgba('#16a34a'),
  present: hexToRgba('#eab308'),
  absent: hexToRgba('#4b5563'),
  textPrimary: '#f9fafb',
  textAccent: '#62a0ea',
  textMuted: '#d1d5db',
} as const;

const CELL_INSET = 6;

function hexToRgba(hex: string, alpha = 1): RGBA {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : normalized;
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const a = Math.round(alpha * 255);
  return [r, g, b, a];
}

function fillRect(
  data: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  color: RGBA,
) {
  const [r, g, b, a] = color;
  const startX = Math.max(0, Math.floor(x));
  const startY = Math.max(0, Math.floor(y));
  const endX = Math.min(canvasWidth, Math.ceil(x + rectWidth));
  const endY = Math.min(canvasHeight, Math.ceil(y + rectHeight));

  for (let yy = startY; yy < endY; yy += 1) {
    let offset = (yy * canvasWidth + startX) * 4;
    for (let xx = startX; xx < endX; xx += 1) {
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = a;
      offset += 4;
    }
  }
}

function colorForResult(result?: LetterResult): RGBA {
  if (result === 'correct') return palette.correct;
  if (result === 'present') return palette.present;
  if (result === 'absent') return palette.absent;
  return palette.empty;
}

export interface WordleShareImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export const generateWordleShareImageData = (
  guesses: GuessEntry[],
): WordleShareImageData => {
  const { width: canvasWidth, height: canvasHeight, card, header, board } =
    WORDLE_SHARE_LAYOUT;
  const data = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);

  fillRect(data, canvasWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight, palette.outer);
  fillRect(
    data,
    canvasWidth,
    canvasHeight,
    card.x,
    card.y,
    card.width,
    card.height,
    palette.card,
  );
  fillRect(
    data,
    canvasWidth,
    canvasHeight,
    header.x,
    header.y,
    header.width,
    header.height,
    palette.header,
  );
  fillRect(
    data,
    canvasWidth,
    canvasHeight,
    board.x,
    board.y,
    board.width,
    board.height,
    palette.boardBackground,
  );

  for (let row = 0; row < CONFIG.rows; row += 1) {
    const entry = guesses[row];
    const rowResults = entry?.result ?? [];
    for (let col = 0; col < CONFIG.cols; col += 1) {
      const cellX = board.x + col * (board.cellSize + board.gap);
      const cellY = board.y + row * (board.cellSize + board.gap);
      fillRect(
        data,
        canvasWidth,
        canvasHeight,
        cellX,
        cellY,
        board.cellSize,
        board.cellSize,
        palette.border,
      );
      fillRect(
        data,
        canvasWidth,
        canvasHeight,
        cellX + CELL_INSET,
        cellY + CELL_INSET,
        board.cellSize - CELL_INSET * 2,
        board.cellSize - CELL_INSET * 2,
        colorForResult(rowResults[col]),
      );
    }
  }

  return {
    width: canvasWidth,
    height: canvasHeight,
    data,
  };
};

export interface WordleShareScore {
  attempts: number;
  solved: boolean;
  scoreText: string;
  statusText: string;
}

export const computeWordleShareScore = (
  guesses: GuessEntry[],
  solution: string,
): WordleShareScore => {
  const solvedIndex = guesses.findIndex((g) => g.guess === solution);
  const solved = solvedIndex !== -1;
  const attempts = solved ? solvedIndex + 1 : guesses.length;
  const scoreText = `${solved ? attempts : 'X'}/${CONFIG.rows}`;
  const statusText = solved
    ? `Solved in ${attempts} ${attempts === 1 ? 'try' : 'tries'}`
    : `Missed • ${solution}`;

  return { attempts, solved, scoreText, statusText };
};

const createImageData = (
  width: number,
  height: number,
  data: Uint8ClampedArray,
): ImageData => {
  if (typeof ImageData !== 'undefined') {
    return new ImageData(data, width, height);
  }
  // Fallback for environments missing ImageData constructor (should be rare on browsers)
  const context = document.createElement('canvas').getContext('2d');
  if (!context) {
    throw new Error('Unable to create canvas context for ImageData fallback.');
  }
  const imageData = context.createImageData(width, height);
  imageData.data.set(data);
  return imageData;
};

const applyShareTypography = (
  ctx: CanvasRenderingContext2D,
  score: WordleShareScore,
  solution: string,
) => {
  const { header, footer, width: canvasWidth } = WORDLE_SHARE_LAYOUT;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = palette.textPrimary;
  ctx.font = `700 ${Math.round(header.height * 0.38)}px Ubuntu, 'Segoe UI', sans-serif`;
  ctx.fillText('Wordle', canvasWidth / 2, header.y + header.height * 0.38);

  ctx.fillStyle = palette.textAccent;
  ctx.font = `600 ${Math.round(header.height * 0.32)}px Ubuntu, 'Segoe UI', sans-serif`;
  ctx.fillText(score.scoreText, canvasWidth / 2, header.y + header.height * 0.72);

  ctx.fillStyle = palette.textMuted;
  ctx.font = `400 ${Math.round(footer.height * 0.38)}px Ubuntu, 'Segoe UI', sans-serif`;
  ctx.fillText(score.statusText, canvasWidth / 2, footer.y + footer.height * 0.35);

  if (!score.solved) {
    ctx.font = `500 ${Math.round(footer.height * 0.3)}px Ubuntu, 'Segoe UI', sans-serif`;
    ctx.fillText(`Answer: ${solution}`, canvasWidth / 2, footer.y + footer.height * 0.7);
  }
};

export const paintWordleShareCanvas = (
  canvas: HTMLCanvasElement,
  guesses: GuessEntry[],
  solution: string,
): WordleShareScore => {
  const { width: canvasWidth, height: canvasHeight } = WORDLE_SHARE_LAYOUT;
  const image = generateWordleShareImageData(guesses);
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context not available.');
  }
  const imageData = createImageData(image.width, image.height, image.data);
  ctx.putImageData(imageData, 0, 0);

  const score = computeWordleShareScore(guesses, solution);
  applyShareTypography(ctx, score, solution);
  return score;
};

const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to export canvas.'));
        }
      }, 'image/png');
      return;
    }

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        array[i] = binary.charCodeAt(i);
      }
      resolve(new Blob([array], { type: 'image/png' }));
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Failed to export canvas.'));
    }
  });

export const renderWordleShareCanvas = async (
  guesses: GuessEntry[],
  solution: string,
): Promise<{ blob: Blob; score: WordleShareScore }> => {
  if (typeof document === 'undefined') {
    throw new Error('Canvas rendering is only available in the browser.');
  }

  const canvas = document.createElement('canvas');
  const score = paintWordleShareCanvas(canvas, guesses, solution);
  const blob = await canvasToBlob(canvas);
  return { blob, score };
};

export default {
  WORDLE_SHARE_LAYOUT,
  generateWordleShareImageData,
  computeWordleShareScore,
  paintWordleShareCanvas,
  renderWordleShareCanvas,
};

