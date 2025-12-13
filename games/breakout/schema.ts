import { z } from 'zod';

export const ROWS = 5;
export const COLS = 10;

export const CellSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const GridSchema = z
  .array(z.array(CellSchema).length(COLS))
  .length(ROWS);

export type Cell = z.infer<typeof CellSchema>;
export type Grid = z.infer<typeof GridSchema>;

const encodeBase64 = (value: string) => {
  if (typeof btoa === 'function') return btoa(value);
  return Buffer.from(value, 'utf-8').toString('base64');
};

const decodeBase64 = (value: string) => {
  if (typeof atob === 'function') return atob(value);
  return Buffer.from(value, 'base64').toString('utf-8');
};

export const encodeGrid = (grid: Grid) => {
  const base64 = encodeBase64(JSON.stringify(grid));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const decodeGrid = (encoded: string): Grid | null => {
  try {
    const padded = encoded.padEnd(encoded.length + ((4 - (encoded.length % 4)) % 4), '=');
    const str = decodeBase64(padded.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(str);
    const res = GridSchema.safeParse(parsed);
    if (res.success) return res.data;
  } catch {
    /* ignore */
  }
  return null;
};

export const validateGrid = (grid: unknown) => GridSchema.safeParse(grid);
