import { promises as fs } from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'network-connections.json');

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await fs.readFile(filePath, 'utf8').catch(() => '[]');
      const connections = JSON.parse(data || '[]');
      res.status(200).json({ connections });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load connections' });
    }
    return;
  }
  if (req.method === 'POST') {
    const { connections } = req.body || {};
    if (!Array.isArray(connections)) {
      res.status(400).json({ error: 'Invalid connections' });
      return;
    }
    try {
      await fs.writeFile(filePath, JSON.stringify(connections, null, 2));
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save connections' });
    }
    return;
  }
  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end('Method Not Allowed');
}
