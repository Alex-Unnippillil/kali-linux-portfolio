import { kv } from './kv';

export interface Stats {
  wins: number;
  losses: number;
  pushes: number;
  bankroll: number;
}

const PREFIX = 'blackjack:';

export async function getStats(id: string): Promise<Stats> {
  const stats = await kv.get<Stats>(PREFIX + id);
  return stats ?? { wins: 0, losses: 0, pushes: 0, bankroll: 1000 };
}

export async function setStats(id: string, stats: Stats): Promise<void> {
  await kv.set(PREFIX + id, stats);
}
