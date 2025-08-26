import modules from '../../components/apps/metasploit/modules.json';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { command } = req.body || {};
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'No command provided' });
  }

  const trimmed = command.trim();
  if (trimmed.toLowerCase().startsWith('search ')) {
    const query = trimmed.slice(7).toLowerCase();
    const results = modules.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
    );
    let output = 'Matching Modules\n================\n\n   #  Name                                         Description\n   -  ----                                         -----------\n';
    results.forEach((m, idx) => {
      const name = m.name.padEnd(44, ' ');
      output += `   ${idx}  ${name}${m.description}\n`;
    });
    if (results.length === 0) {
      output += '\nNo results found.';
    }
    return res.status(200).json({ output });
  }

  return res.status(200).json({ output: 'Command not supported in mock environment.' });
}
