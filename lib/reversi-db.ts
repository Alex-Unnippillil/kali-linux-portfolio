import { kv } from './kv';

export interface ReversiDB {
  ratings: Record<string, number>;
  matches: Array<{ white: string; black: string; winner: string; time: number }>;
  tournaments: Array<{ id: number; players: string[]; bracket: string[][] }>;
}

const KEY = 'reversi-db';

export async function readDB(): Promise<ReversiDB> {
  return (await kv.get<ReversiDB>(KEY)) ?? { ratings: {}, matches: [], tournaments: [] };
}

export async function writeDB(db: ReversiDB) {
  await kv.set(KEY, db);
}
