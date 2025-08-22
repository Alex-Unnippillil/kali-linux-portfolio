import fs from 'fs';
import path from 'path';

export interface ReversiDB {
  ratings: Record<string, number>;
  matches: Array<{ white: string; black: string; winner: string; time: number }>;
  tournaments: Array<{ id: number; players: string[]; bracket: string[][] }>;
}

const file = path.join(process.cwd(), 'data', 'reversi.json');

export function readDB(): ReversiDB {
  try {
    const data = fs.readFileSync(file, 'utf-8');
    return JSON.parse(data) as ReversiDB;
  } catch (e) {
    return { ratings: {}, matches: [], tournaments: [] };
  }
}

export function writeDB(db: ReversiDB) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}
