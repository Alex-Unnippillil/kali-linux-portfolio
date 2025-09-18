import modules from '../../components/apps/metasploit/modules.json';

const resolvePlatforms = (input) => {
  if (Array.isArray(input)) return input.filter(Boolean);
  if (typeof input === 'string' && input) {
    return input
      .split(/[\\/,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

export default function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }
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
    const raw = trimmed.slice(7).trim();
    const match = raw.match(/^([a-z]+):(.+)/i);
    let field = 'name';
    let query = raw;
    if (match) {
      field = match[1].toLowerCase();
      query = match[2];
    }
    const q = query.toLowerCase();
    const results = modules.filter((m) => {
      if (field === 'cve') {
        return (m.cve || []).some((c) => c.toLowerCase().includes(q));
      }
      if (field === 'name' || field === 'type') {
        return (m[field] || '').toLowerCase().includes(q);
      }
      if (field === 'platform') {
        return resolvePlatforms(m.platform)
          .join(', ')
          .toLowerCase()
          .includes(q);
      }
      return (
        m.name.toLowerCase().includes(q) ||
        (m.type || '').toLowerCase().includes(q) ||
        resolvePlatforms(m.platform)
          .join(', ')
          .toLowerCase()
          .includes(q) ||
        (m.cve || []).some((c) => c.toLowerCase().includes(q)) ||
        m.description.toLowerCase().includes(q)
      );
    });
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
