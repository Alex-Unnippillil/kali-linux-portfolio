export type Density = 'regular' | 'compact';

export interface GridConfig {
  iconWidth: number;
  iconHeight: number;
  gap: number;
  padding: number;
}

export interface GridMetrics {
  columns: number;
  rows: number;
  columnWidth: number;
  rowHeight: number;
}

export interface IconPosition {
  column: number;
  row: number;
}

export const GRID_CONFIG: Record<Density, GridConfig> = {
  regular: { iconWidth: 96, iconHeight: 88, gap: 16, padding: 16 },
  compact: { iconWidth: 88, iconHeight: 80, gap: 12, padding: 12 },
};

const clamp = (value: number, min: number, max: number) => {
  if (value <= min) return min;
  if (value >= max) return max;
  return value;
};

export function calculateGridMetrics(
  containerWidth: number,
  containerHeight: number,
  iconCount: number,
  config: GridConfig,
): GridMetrics {
  const safeWidth = Math.max(0, containerWidth - config.padding * 2);
  const safeHeight = Math.max(0, containerHeight - config.padding * 2);
  const columnWidth = config.iconWidth + config.gap;
  const rowHeight = config.iconHeight + config.gap;
  const columns = Math.max(1, Math.floor(safeWidth / columnWidth) || 1);
  const minimumRows = Math.ceil(iconCount / columns) || 1;
  const heightRows = Math.max(1, Math.floor(safeHeight / rowHeight));
  const rows = Math.max(minimumRows, heightRows);

  return {
    columns,
    rows,
    columnWidth,
    rowHeight,
  };
}

const cellKey = (position: IconPosition) => `${position.column}:${position.row}`;

const clampPosition = (position: IconPosition, metrics: GridMetrics): IconPosition => ({
  column: clamp(position.column, 0, Math.max(0, metrics.columns - 1)),
  row: clamp(position.row, 0, Math.max(0, metrics.rows - 1)),
});

export function generateCellOrder(metrics: GridMetrics, iconCount: number): IconPosition[] {
  const total = Math.max(metrics.columns * metrics.rows, iconCount || 1);
  const cells: IconPosition[] = [];
  for (let column = 0; column < metrics.columns; column += 1) {
    for (let row = 0; row < metrics.rows; row += 1) {
      cells.push({ column, row });
      if (cells.length >= total) return cells;
    }
  }
  return cells;
}

export function resolveGridConflicts(
  draft: Record<string, IconPosition>,
  iconIds: string[],
  metrics: GridMetrics,
): Record<string, IconPosition> {
  const orderedCells = generateCellOrder(metrics, iconIds.length);
  const taken = new Set<string>();
  let fallbackIndex = 0;
  const result: Record<string, IconPosition> = {};

  const takeCell = (preferred?: IconPosition): IconPosition => {
    if (preferred) {
      const clamped = clampPosition(preferred, metrics);
      const key = cellKey(clamped);
      if (!taken.has(key)) {
        taken.add(key);
        return clamped;
      }
    }

    while (fallbackIndex < orderedCells.length) {
      const candidate = orderedCells[fallbackIndex];
      fallbackIndex += 1;
      const key = cellKey(candidate);
      if (!taken.has(key)) {
        taken.add(key);
        return candidate;
      }
    }

    // All cells taken; fall back to last known cell
    const last = orderedCells[orderedCells.length - 1] ?? { column: 0, row: 0 };
    taken.add(cellKey(last));
    return last;
  };

  iconIds.forEach((id) => {
    const preferred = draft[id];
    const cell = takeCell(preferred);
    result[id] = cell;
  });

  return result;
}

export function snapPixelToGrid(
  x: number,
  y: number,
  metrics: GridMetrics,
  config: GridConfig,
): IconPosition {
  const relativeX = x - config.padding;
  const relativeY = y - config.padding;
  const column = Math.round(relativeX / metrics.columnWidth);
  const row = Math.round(relativeY / metrics.rowHeight);
  return clampPosition({ column, row }, metrics);
}

export function positionsAreEqual(
  a: Record<string, IconPosition>,
  b: Record<string, IconPosition>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => {
    const posA = a[key];
    const posB = b[key];
    return posB && posA.column === posB.column && posA.row === posB.row;
  });
}
