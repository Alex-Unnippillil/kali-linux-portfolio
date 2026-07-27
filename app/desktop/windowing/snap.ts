export const GRID = 16;

export const snap = (value: number, grid: number = GRID): number => {
  if (!Number.isFinite(value) || !Number.isFinite(grid) || grid <= 0) {
    return value;
  }

  return Math.round(value / grid) * grid;
};
