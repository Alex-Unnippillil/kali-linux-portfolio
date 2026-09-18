// Shared guard for deterministic educational APIs. Never execute commands or contact targets.
export const boundedText = (value, max = 8192) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export function postOnly(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') return true;
  res.setHeader('Allow', ['POST']);
  res.status(405).json({ error: 'Method not allowed' });
  return false;
}
