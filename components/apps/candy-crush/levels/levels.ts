import { z } from 'zod';
import type { LevelDefinition } from '../engine/types';

const coordSchema = z.object({ r: z.number().int().nonnegative(), c: z.number().int().nonnegative() });

const objectiveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('score'), target: z.number().positive(), progress: z.number().nonnegative().default(0) }),
  z.object({ type: z.literal('collectColor'), color: z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'orange']), target: z.number().positive(), progress: z.number().nonnegative().default(0) }),
  z.object({ type: z.literal('clearJelly'), target: z.number().positive(), progress: z.number().nonnegative().default(0) }),
  z.object({ type: z.literal('clearIce'), target: z.number().positive(), progress: z.number().nonnegative().default(0) }),
]);

const levelSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  rows: z.number().int().min(6).max(10),
  cols: z.number().int().min(6).max(10),
  moves: z.number().int().positive(),
  colors: z.array(z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'orange'])).min(4),
  spawnWeights: z.record(z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'orange']), z.number().positive()).partial().optional(),
  objectives: z.array(objectiveSchema).min(1),
  blockers: z.object({ jelly: z.array(coordSchema).optional(), doubleJelly: z.array(coordSchema).optional(), ice: z.array(coordSchema).optional(), doubleIce: z.array(coordSchema).optional() }).optional(),
  mask: z.array(coordSchema).optional(),
});

const ring = (rows: number, cols: number) => {
  const coords = [];
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) coords.push({ r, c });
  return coords;
};

const defaultColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;

const rawLevels: LevelDefinition[] = [
  { id: 1, name: 'Boot Sector', rows: 9, cols: 9, moves: 22, colors: [...defaultColors], objectives: [{ type: 'score', target: 2500, progress: 0 }] },
  { id: 2, name: 'Packet Flow', rows: 9, cols: 9, moves: 20, colors: [...defaultColors], objectives: [{ type: 'collectColor', color: 'blue', target: 24, progress: 0 }], blockers: { jelly: ring(9, 9) } },
  { id: 3, name: 'Kernel Pulse', rows: 9, cols: 9, moves: 19, colors: [...defaultColors], objectives: [{ type: 'clearJelly', target: 14, progress: 0 }, { type: 'score', target: 3000, progress: 0 }], blockers: { jelly: [{ r: 4, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 5 }, { r: 3, c: 4 }, { r: 5, c: 4 }], doubleJelly: [{ r: 2, c: 2 }, { r: 2, c: 6 }, { r: 6, c: 2 }, { r: 6, c: 6 }] } },
  { id: 4, name: 'Ice Cache', rows: 8, cols: 8, moves: 18, colors: [...defaultColors], objectives: [{ type: 'clearIce', target: 10, progress: 0 }], blockers: { ice: [{ r: 1, c: 1 }, { r: 1, c: 6 }, { r: 6, c: 1 }, { r: 6, c: 6 }, { r: 3, c: 3 }, { r: 4, c: 4 }], doubleIce: [{ r: 3, c: 4 }, { r: 4, c: 3 }, { r: 2, c: 2 }, { r: 5, c: 5 }] } },
  { id: 5, name: 'Hash Bloom', rows: 9, cols: 9, moves: 18, colors: [...defaultColors], spawnWeights: { yellow: 0.7, purple: 1.4 }, objectives: [{ type: 'collectColor', color: 'purple', target: 28, progress: 0 }, { type: 'score', target: 4200, progress: 0 }] },
  { id: 6, name: 'Firewall', rows: 9, cols: 9, moves: 17, colors: [...defaultColors], objectives: [{ type: 'clearJelly', target: 20, progress: 0 }, { type: 'clearIce', target: 8, progress: 0 }], blockers: { jelly: ring(9, 9), ice: [{ r: 4, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 5 }, { r: 3, c: 4 }, { r: 5, c: 4 }, { r: 2, c: 4 }, { r: 6, c: 4 }, { r: 4, c: 2 }] } },
  { id: 7, name: 'Subnet Rift', rows: 9, cols: 9, moves: 16, colors: [...defaultColors], objectives: [{ type: 'score', target: 5000, progress: 0 }, { type: 'collectColor', color: 'green', target: 26, progress: 0 }], mask: Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => ({ r, c }))).flat().filter((x) => !(x.r === 0 && (x.c < 2 || x.c > 6)) && !(x.r === 8 && (x.c < 2 || x.c > 6))) },
  { id: 8, name: 'Hex Tunnel', rows: 8, cols: 9, moves: 15, colors: [...defaultColors], objectives: [{ type: 'clearJelly', target: 18, progress: 0 }, { type: 'score', target: 5200, progress: 0 }], blockers: { doubleJelly: [{ r: 1, c: 1 }, { r: 1, c: 7 }, { r: 6, c: 1 }, { r: 6, c: 7 }, { r: 3, c: 4 }, { r: 4, c: 4 }, { r: 2, c: 4 }, { r: 5, c: 4 }, { r: 3, c: 3 }, { r: 4, c: 5 }] } },
  { id: 9, name: 'Zero-Day Jam', rows: 9, cols: 9, moves: 14, colors: [...defaultColors], objectives: [{ type: 'collectColor', color: 'orange', target: 30, progress: 0 }, { type: 'clearIce', target: 12, progress: 0 }], blockers: { ice: ring(9, 9).slice(0, 12), doubleIce: ring(9, 9).slice(12, 24) }, spawnWeights: { orange: 1.5, blue: 0.8 } },
  { id: 10, name: 'Root Access', rows: 9, cols: 9, moves: 13, colors: [...defaultColors], objectives: [{ type: 'score', target: 7000, progress: 0 }, { type: 'clearJelly', target: 22, progress: 0 }, { type: 'collectColor', color: 'red', target: 24, progress: 0 }], blockers: { jelly: ring(9, 9), doubleJelly: [{ r: 4, c: 4 }, { r: 4, c: 3 }, { r: 4, c: 5 }, { r: 3, c: 4 }, { r: 5, c: 4 }] }, spawnWeights: { red: 1.4, purple: 0.8 } },
];

export const levels = rawLevels.map((level) => levelSchema.parse(level));

export const getLevelById = (id: number) => levels.find((level) => level.id === id) ?? levels[0];
