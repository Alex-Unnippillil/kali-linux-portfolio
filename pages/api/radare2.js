import { verifyCsrf } from '../../utils/csrf';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCsrf(req)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  const { action = '', hex = '', file = '' } = req.body || {};

  if (action === 'disasm') {
    if (typeof hex !== 'string' || !/^[0-9a-fA-F]+$/.test(hex) || hex.length > 2000) {
      return res.status(400).json({ error: 'Invalid hex' });
    }
    const result =
      'Disassembly simulation. Docs: https://rada.re/n/\n' +
      'Ethics: https://www.kali.org/docs/policy/ethical-hacking/';
    return res.status(200).json({ result });
  }

  if (action === 'analyze') {
    if (typeof file !== 'string' || file.length > 10_000) {
      return res.status(400).json({ error: 'Invalid file' });
    }
    const result =
      'Binary analysis simulation. Docs: https://rada.re/n/\n' +
      'Ethics: https://www.kali.org/docs/policy/ethical-hacking/';
    return res.status(200).json({ result });
  }

  return res.status(400).json({ error: 'Invalid request' });
}

