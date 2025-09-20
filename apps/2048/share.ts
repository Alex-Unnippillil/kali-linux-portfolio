const TILE_PALETTE: Record<number, { background: string; color: string }> = {
  2: { background: '#d1d5db', color: '#1f2937' },
  4: { background: '#9ca3af', color: '#1f2937' },
  8: { background: '#facc15', color: '#111827' },
  16: { background: '#eab308', color: '#111827' },
  32: { background: '#f97316', color: '#f9fafb' },
  64: { background: '#ea580c', color: '#f9fafb' },
  128: { background: '#ef4444', color: '#f9fafb' },
  256: { background: '#dc2626', color: '#f9fafb' },
  512: { background: '#b91c1c', color: '#f9fafb' },
  1024: { background: '#22c55e', color: '#0f172a' },
  2048: { background: '#16a34a', color: '#0f172a' },
  4096: { background: '#0ea5e9', color: '#0f172a' },
};

const DEFAULT_TILE = { background: '#1f2937', color: '#e5e7eb' };

const CANVAS_PADDING = 32;
const TILE_GAP = 12;
const TILE_SIZE = 96;
const HEADER_HEIGHT = 140;

export type ShareBoardType = 'classic' | 'hex';

export interface ShareImageOptions {
  board: number[][];
  score: number;
  boardType: ShareBoardType;
  status: 'won' | 'lost';
}

export type ShareAction = 'copied' | 'downloaded';

export interface ShareOutcome {
  blob: Blob;
  action: ShareAction;
}

type ClipboardWithWrite = Clipboard & {
  write?: (items: ClipboardItem[]) => Promise<void>;
};

const formatTileValue = (value: number, boardType: ShareBoardType) => {
  if (value === 0) return '';
  if (boardType === 'hex') return value.toString(16).toUpperCase();
  return value.toString();
};

const resolveBoardSize = (board: number[][]) => {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const boardWidth = cols * TILE_SIZE + Math.max(0, cols - 1) * TILE_GAP;
  return {
    rows,
    cols,
    boardWidth,
  };
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Unable to create PNG blob'));
        }
      }, 'image/png');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      reject(new Error('Unable to create PNG data URL'));
      return;
    }

    let binary: string | null = null;
    if (typeof globalThis.atob === 'function') {
      binary = globalThis.atob(base64);
    } else {
      const bufferFactory = (globalThis as any).Buffer;
      if (bufferFactory) {
        binary = bufferFactory.from(base64, 'base64').toString('binary');
      }
    }

    if (!binary) {
      reject(new Error('Unable to decode PNG data'));
      return;
    }

    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    resolve(new Blob([bytes], { type: 'image/png' }));
  });

export const createShareImage = async ({ board, score, boardType, status }: ShareImageOptions) => {
  if (typeof document === 'undefined') {
    throw new Error('Document is not available to render the share image');
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D context is not supported');
  }

  const { rows, cols, boardWidth } = resolveBoardSize(board);
  const width = Math.max(320, CANVAS_PADDING * 2 + boardWidth);
  const boardHeight = rows * TILE_SIZE + Math.max(0, rows - 1) * TILE_GAP;
  const height = CANVAS_PADDING * 2 + HEADER_HEIGHT + boardHeight;

  canvas.width = width;
  canvas.height = height;

  // Background
  context.fillStyle = '#111827';
  context.fillRect(0, 0, width, height);

  // Header text
  context.fillStyle = '#f9fafb';
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.font = 'bold 48px "Inter", "Arial", sans-serif';
  context.fillText('2048', width / 2, CANVAS_PADDING);

  context.font = '24px "Inter", "Arial", sans-serif';
  const statusText = status === 'won' ? 'You win!' : 'Game over';
  context.fillText(statusText, width / 2, CANVAS_PADDING + 58);

  context.font = '20px "Inter", "Arial", sans-serif';
  context.fillText(`Score: ${score}`, width / 2, CANVAS_PADDING + 96);
  context.fillText(boardType === 'hex' ? 'Mode: Hex 2048' : 'Mode: Classic', width / 2, CANVAS_PADDING + 126);

  const boardLeft = (width - boardWidth) / 2;
  const boardTop = CANVAS_PADDING + HEADER_HEIGHT;

  // Board background
  context.fillStyle = '#1f2937';
  context.fillRect(boardLeft - TILE_GAP / 2, boardTop - TILE_GAP / 2, boardWidth + TILE_GAP, boardHeight + TILE_GAP);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const value = board[r]?.[c] ?? 0;
      const palette = TILE_PALETTE[value] ?? DEFAULT_TILE;
      const x = boardLeft + c * (TILE_SIZE + TILE_GAP);
      const y = boardTop + r * (TILE_SIZE + TILE_GAP);

      context.fillStyle = palette.background;
      context.fillRect(x, y, TILE_SIZE, TILE_SIZE);

      if (value) {
        context.fillStyle = palette.color;
        const fontSize = value >= 1024 ? 28 : value >= 128 ? 30 : 34;
        context.font = `bold ${fontSize}px "Inter", "Arial", sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(formatTileValue(value, boardType), x + TILE_SIZE / 2, y + TILE_SIZE / 2);
      }
    }
  }

  return canvasToBlob(canvas);
};

export const createShareFileName = ({ boardType, status, score }: ShareImageOptions) =>
  `2048-${boardType}-${status}-${score}.png`;

export const triggerDownload = (blob: Blob, filename: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const copyImageToClipboard = async (blob: Blob) => {
  if (typeof navigator === 'undefined') {
    throw new Error('Clipboard API is not available');
  }

  const clipboard = (navigator as unknown as { clipboard?: ClipboardWithWrite }).clipboard;
  const globalWindow = typeof window !== 'undefined' ? (window as Window & typeof globalThis) : undefined;

  if (!clipboard || typeof clipboard.write !== 'function' || !globalWindow?.ClipboardItem) {
    throw new Error('Clipboard write not supported');
  }

  const item = new globalWindow.ClipboardItem({ 'image/png': blob });
  await clipboard.write([item]);
};

export const shareGameResult = async (options: ShareImageOptions): Promise<ShareOutcome> => {
  const blob = await createShareImage(options);

  try {
    await copyImageToClipboard(blob);
    return { blob, action: 'copied' };
  } catch (error) {
    triggerDownload(blob, createShareFileName(options));
    return { blob, action: 'downloaded' };
  }
};
