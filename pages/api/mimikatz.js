import modules from '../../components/apps/mimikatz/modules.json';
import rateLimitEdge from '@/lib/rateLimitEdge';

async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }
  if (req.method === 'GET') {
    const { command } = req.query || {};
    if (command) {
      return res.status(200).json({ output: `Executed ${command}` });
    }
    return res.status(200).json({ modules });
  }

  if (req.method === 'POST') {
    const { script } = req.body || {};
    if (!script) {
      return res.status(400).json({ error: 'No script provided' });
    }
    return res.status(200).json({ output: `Executed script: ${script}` });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

export default rateLimitEdge(handler);
