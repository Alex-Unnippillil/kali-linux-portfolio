import { generateCsrfToken } from '../../lib/csrf';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ ok: false });
    return;
  }
  const token = generateCsrfToken(res);
  res.status(200).json({ ok: true, csrfToken: token });
}
