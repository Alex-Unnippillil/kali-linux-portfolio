import { verifyCsrf } from '../../utils/csrf';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCsrf(req)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  const { hash = '' } = req.body || {};
  const trimmed = String(hash).trim();
  if (!trimmed || trimmed.length > 1000) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const output =
    'John the Ripper simulation. No real cracking performed.\n' +
    'Docs: https://www.openwall.com/john/\n' +
    'Ethics: https://www.kali.org/docs/policy/ethical-hacking/';

  return res.status(200).json({ output });
}
