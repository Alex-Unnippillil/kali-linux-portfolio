import fs from 'fs/promises';
import path from 'path';

export interface Stats {
  wins: number;
  losses: number;
  pushes: number;
  bankroll: number;
}

const DATA_PATH = process.env.USER_STORE_FILE || path.join(process.cwd(), 'data', 'blackjack.json');

let cache: Record<string, Stats> | null = null;

async function load(): Promise<Record<string, Stats>> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    cache = JSON.parse(raw || '{}');
  } catch {
    cache = {};
  }
  return cache;
}

export async function getStats(id: string): Promise<Stats> {
  const data = await load();
  return data[id] || { wins: 0, losses: 0, pushes: 0, bankroll: 1000 };
}

export async function setStats(id: string, stats: Stats): Promise<void> {
  const data = await load();
  data[id] = stats;
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}
