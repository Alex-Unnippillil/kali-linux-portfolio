import { boundedText, postOnly } from '../../lib/simulation-response';
export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  if (!boundedText(req.body?.hash)) return res.status(400).json({ error: 'Provide a demonstration hash of at most 8192 characters.' });
  return res.status(200).json({ simulated: true, output: '[demo] Hash-auditing workflow fixture. No password recovery was attempted and no input was saved. Use salted, deliberately expensive password hashes.' });
}
