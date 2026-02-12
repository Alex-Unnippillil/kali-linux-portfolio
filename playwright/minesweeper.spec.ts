import { test, expect, type Locator, type Page } from '@playwright/test';

const BOARD_SIZE = 8;
const CELL_SIZE = 32;
const MINES_COUNT = 10;
const INTERMEDIATE_SEED = 1;
const START_CELL: [number, number] = [0, 0];
const INTERMEDIATE_SHARE_CODE = `${INTERMEDIATE_SEED.toString(36)}-${START_CELL[0]}-${START_CELL[1]}`;

type BoardCell = {
  mine: boolean;
  adjacent: number;
};

type Coord = [number, number];

const DIRS = [-1, 0, 1];

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateBoard(
  seed: number,
  size: number,
  mines: number,
  startX: number,
  startY: number,
): BoardCell[][] {
  const board: BoardCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ mine: false, adjacent: 0 })),
  );
  const rng = mulberry32(seed);
  const indices = Array.from({ length: size * size }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const safe = new Set<number>();
  for (const dx of DIRS) {
    for (const dy of DIRS) {
      const nx = startX + dx;
      const ny = startY + dy;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
        safe.add(nx * size + ny);
      }
    }
  }

  let placed = 0;
  for (const idx of indices) {
    if (placed >= mines) break;
    if (safe.has(idx)) continue;
    const x = Math.floor(idx / size);
    const y = idx % size;
    board[x][y].mine = true;
    placed += 1;
  }

  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      if (board[x][y].mine) continue;
      let count = 0;
      for (const dx of DIRS) {
        for (const dy of DIRS) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny].mine) {
            count += 1;
          }
        }
      }
      board[x][y].adjacent = count;
    }
  }

  return board;
}

function computeRevealed(board: BoardCell[][], starts: Coord[]): Coord[] {
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue: Coord[] = [];
  for (const [sx, sy] of starts) {
    if (sx >= 0 && sx < size && sy >= 0 && sy < size && !visited[sx][sy]) {
      visited[sx][sy] = true;
      queue.push([sx, sy]);
    }
  }

  const cells: Coord[] = [];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const cell = board[x][y];
    cells.push([x, y]);
    if (cell.mine) continue;
    if (cell.adjacent === 0) {
      for (const dx of DIRS) {
        for (const dy of DIRS) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[nx][ny]) {
            visited[nx][ny] = true;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
  return cells;
}

const INTERMEDIATE_BOARD = generateBoard(
  INTERMEDIATE_SEED,
  BOARD_SIZE,
  MINES_COUNT,
  START_CELL[0],
  START_CELL[1],
);

const INITIAL_REVEALED = new Set(
  computeRevealed(INTERMEDIATE_BOARD, [START_CELL]).map(([x, y]) => `${x},${y}`),
);

const INTERMEDIATE_SAFE_CELLS: Coord[] = [];
for (let x = 0; x < BOARD_SIZE; x += 1) {
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    if (INTERMEDIATE_BOARD[x][y].mine) continue;
    const key = `${x},${y}`;
    if (!INITIAL_REVEALED.has(key)) {
      INTERMEDIATE_SAFE_CELLS.push([x, y]);
    }
  }
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem('booting_screen', 'false');
    window.localStorage.setItem('screen-locked', 'false');
  });
});

async function ensureDesktopReady(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.getByRole('navigation', { name: 'Dock' }).waitFor();
  const lockScreen = page.locator('#ubuntu-lock-screen');
  if (await lockScreen.isVisible()) {
    await page.mouse.click(5, 5);
    await expect(lockScreen).toBeHidden();
  }
  const bootingSpinner = page.locator('img[alt="Ubuntu Process Symbol"]');
  if (await bootingSpinner.count()) {
    await bootingSpinner.first().waitFor({ state: 'hidden' });
  }
  const aboutClose = page.locator('#close-about-alex');
  if (await aboutClose.count()) {
    await aboutClose.click();
  }
}

async function openMinesweeperWindow(page: Page): Promise<Locator> {
  await page.getByAltText('Ubuntu view app').click();
  const searchBox = page.getByPlaceholder('Search');
  await expect(searchBox).toBeVisible();
  const minesweeperIcon = page.getByRole('button', { name: 'Minesweeper' });
  await minesweeperIcon.dblclick();
  await searchBox.waitFor({ state: 'hidden' });
  const windowFrame = page.locator('#minesweeper');
  await expect(windowFrame).toBeVisible();
  return windowFrame;
}

async function closeHelpIfPresent(windowFrame: Locator) {
  const helpDialog = windowFrame.getByRole('dialog');
  if (await helpDialog.isVisible()) {
    const closeButton = helpDialog.getByRole('button', { name: 'Close' });
    await closeButton.click();
    await helpDialog.waitFor({ state: 'hidden' });
  }
}

async function setupFpsCapture(page: Page) {
  await page.waitForFunction(() => Boolean((window as any).pubsub));
  await page.evaluate(() => {
    const win = window as unknown as {
      __fpsSamples?: number[];
      __fpsUnsubscribe?: () => void;
      pubsub?: { subscribe: (topic: string, cb: (data: unknown) => void) => () => void };
    };
    if (win.__fpsSamples) return;
    const samples: number[] = [];
    const unsubscribe = win.pubsub?.subscribe('fps', (value) => {
      if (typeof value === 'number') samples.push(value);
    });
    win.__fpsSamples = samples;
    win.__fpsUnsubscribe = unsubscribe;
  });
}

async function clickCell(canvas: Locator, row: number, col: number) {
  await canvas.click({
    position: {
      x: col * CELL_SIZE + CELL_SIZE / 2,
      y: row * CELL_SIZE + CELL_SIZE / 2,
    },
  });
}

test('plays the intermediate board with stable FPS and clean teardown', async ({ page }) => {
  await ensureDesktopReady(page);
  const windowFrame = await openMinesweeperWindow(page);
  await closeHelpIfPresent(windowFrame);

  await setupFpsCapture(page);

  const codeInput = windowFrame.getByPlaceholder('seed or share code');
  await codeInput.fill(INTERMEDIATE_SHARE_CODE);
  await windowFrame.getByRole('button', { name: 'Load' }).click();
  await expect(windowFrame.getByText('Game in progress')).toBeVisible();

  const canvas = windowFrame.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);

  for (const [row, col] of INTERMEDIATE_SAFE_CELLS) {
    await clickCell(canvas, row, col);
    if (await windowFrame.getByText(/You win!/).isVisible()) {
      break;
    }
    await page.waitForTimeout(20);
  }

  await expect(windowFrame.getByText(/You win!/)).toBeVisible();

  await page.waitForTimeout(500);
  const fpsStats = await page.evaluate(() => {
    const samples = (window as any).__fpsSamples as number[] | undefined;
    if (!samples || samples.length === 0) return null;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    return { count: samples.length, min, max, avg };
  });

  expect(fpsStats).not.toBeNull();
  expect(fpsStats!.count).toBeGreaterThan(20);
  expect(fpsStats!.min).toBeGreaterThan(30);
  expect(fpsStats!.max).toBeLessThan(120);

  const resetButton = windowFrame.getByRole('button', { name: 'Reset game' });
  for (let i = 0; i < 5; i += 1) {
    await resetButton.click();
    await expect(windowFrame.getByText('Click any cell to start')).toBeVisible();
    await clickCell(canvas, 3, 3);
    await page.waitForTimeout(100);
  }

  const fpsCountBeforeClose = await page.evaluate(
    () => ((window as any).__fpsSamples as number[] | undefined)?.length ?? 0,
  );

  await windowFrame.getByRole('button', { name: 'Window close' }).click();
  await expect(windowFrame).toHaveCount(0);
  await expect(canvas).toHaveCount(0);
  await expect(page.getByText('Export JSON')).toHaveCount(0);

  await page.waitForTimeout(300);
  const fpsCountAfterClose = await page.evaluate(
    () => ((window as any).__fpsSamples as number[] | undefined)?.length ?? 0,
  );
  expect(fpsCountAfterClose).toBe(fpsCountBeforeClose);

  await page.evaluate(() => {
    const win = window as any;
    if (typeof win.__fpsUnsubscribe === 'function') {
      win.__fpsUnsubscribe();
      win.__fpsUnsubscribe = undefined;
    }
  });
});
