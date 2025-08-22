import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, score } = req.body || {};
    if (typeof name !== 'string' || name.length === 0 || name.length > 50) {
      return res.status(400).json({ error: 'invalid name' });
    }
    const s = Number(score);
    if (!Number.isFinite(s) || s < 0) {
      return res.status(400).json({ error: 'invalid score' });
    }
    const entry = { name, score: s, time: Date.now() };
    await kv.zadd('2048_leaderboard', { score: s, member: JSON.stringify(entry) });
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'GET') {
    const data = await kv.zrange('2048_leaderboard', 0, 9, { rev: true });
    const scores = data.map((m) => JSON.parse(m));
    return res.status(200).json({ scores });
  }
  res.status(405).end();
}
