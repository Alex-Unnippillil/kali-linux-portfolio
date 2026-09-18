import { boundedText, postOnly } from '../../lib/simulation-response';
export default async function handler(req, res) {
  if (!postOnly(req, res)) return;
  const { target, service, userList, passList, action } = req.body || {};
  if (action === 'resume') return res.status(200).json({ simulated: true, output: '[demo] No attack sessions are stored. Nothing was resumed.' });
  if (![target, service, userList, passList].every((value) => boundedText(value))) return res.status(400).json({ error: 'Provide bounded demonstration fields.' });
  if (!['lab.local', 'demo.local', '127.0.0.1', 'localhost'].includes(target)) return res.status(400).json({ error: 'Only lab.local, demo.local or loopback labels are accepted. No host is contacted.' });
  if (!['http', 'https', 'ssh', 'ftp', 'smtp', 'http-get', 'http-post-form'].includes(service)) return res.status(400).json({ error: 'Unsupported service' });
  return res.status(200).json({ simulated: true, output: '[demo] Authentication workflow fixture.\nInput lists were not executed or retained.\nNo connections, credential attempts, or recovered passwords.\nLesson: use MFA, rate limits and account monitoring.' });
}
