import modules from '../../components/apps/mimikatz/modules.json';
import { verifyCsrf } from '../../utils/csrf';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { command } = req.query || {};
    if (command) {
      return res.status(200).json({ output: `Executed ${command}` });
    }
    return res.status(200).json({ modules });
  }

  if (req.method === 'POST') {
    if (!verifyCsrf(req)) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
    const { script = '' } = req.body || {};
    const trimmed = String(script).trim();
    if (!trimmed || trimmed.length > 2000) {
      return res.status(400).json({ error: 'No script provided' });
    }
    const output =
      'Mimikatz simulation. No real credentials were accessed.\n' +
      'Docs: https://github.com/gentilkiwi/mimikatz\n' +
      'Ethics: https://www.kali.org/docs/policy/ethical-hacking/';
    return res.status(200).json({ output });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
