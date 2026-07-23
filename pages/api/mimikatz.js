import modules from '../../components/apps/mimikatz/modules.json';

const summarizeCommand = (value) => String(value || '').trim().replace(/[\r\n]+/g, ' ').slice(0, 120);

export default async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }

  if (req.method === 'GET') {
    const { command } = req.query || {};
    if (command) {
      return res.status(200).json({
        output: `Mimikatz training simulation only. Parsed command: ${summarizeCommand(command)}. No credential access or host inspection occurred.`,
      });
    }
    return res.status(200).json({ modules });
  }

  if (req.method === 'POST') {
    const { script } = req.body || {};
    if (typeof script !== 'string' || !script.trim()) {
      return res.status(400).json({ error: 'No script provided' });
    }
    return res.status(200).json({
      output: `Mimikatz script simulation accepted ${script.split(/\r?\n/).filter(Boolean).length} line(s). No commands were executed.`,
    });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
