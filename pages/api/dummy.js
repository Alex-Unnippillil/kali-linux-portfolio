import { validateCsrfToken } from '../../lib/csrf';

export default function handler(req, res) {
  if (req.method === 'POST') {
    if (!validateCsrfToken(req)) {
      res.status(403).json({ message: 'invalid_csrf' });
      return;
    }
    res.status(200).json({ message: 'Received' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
