import modules from '../../components/apps/mimikatz/modules.json';
import { boundedText } from '../../lib/simulation-response';
const output = '[demo] Credential-protection fixture. No command or script was executed. No process memory, credentials, secrets or system privileges were accessed.';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') {
    if (req.query?.command === undefined) return res.status(200).json({ simulated: true, modules });
    if (!boundedText(req.query.command)) return res.status(400).json({ error: 'Invalid demonstration command.' });
    return res.status(200).json({ simulated: true, output });
  }
  if (req.method === 'POST') {
    if (!boundedText(req.body?.script)) return res.status(400).json({ error: 'Provide a bounded demonstration script.' });
    return res.status(200).json({ simulated: true, output });
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
}
