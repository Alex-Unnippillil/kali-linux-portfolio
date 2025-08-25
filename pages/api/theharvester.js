import { exec } from 'child_process';

export default function handler(req, res) {
  const { domain, engine } = req.body || {};
  if (!domain) {
    res.status(400).json({ error: 'Domain required' });
    return;
  }
  const cmd = `theHarvester -d ${domain} -b ${engine}`;
  exec(cmd, { timeout: 1000 * 60 }, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: stderr || error.message });
    } else {
      res.status(200).json({ output: stdout });
    }
  });
}
