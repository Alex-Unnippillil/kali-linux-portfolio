import { spawn } from 'child_process';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { command } = req.body || {};
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'No command provided' });
  }

  const proc = spawn('msfconsole', ['-q', '-x', `${command}; exit`]);
  let output = '';

  proc.stdout.on('data', (data) => {
    output += data.toString();
  });
  proc.stderr.on('data', (data) => {
    output += data.toString();
  });
  proc.on('close', (code) => {
    res.status(200).json({ output, code });
  });
}
