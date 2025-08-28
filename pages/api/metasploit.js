import modules from '../../components/apps/metasploit/modules.json';
import { verifyCsrf } from '../../utils/csrf';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  if (!verifyCsrf(req)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  const { command = '' } = req.body || {};
  if (typeof command !== 'string' || command.length > 200) {
    return res.status(400).json({ error: 'No command provided' });
  }

  const trimmed = command.trim();
  let output = '';
  if (trimmed.toLowerCase().startsWith('search ')) {
    const query = trimmed.slice(7).toLowerCase();
    const results = modules.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query)
    );
    output =
      'Matching Modules\n================\n\n   #  Name                                         Description\n   -  --                                           -----------\n';
    results.forEach((m, idx) => {
      const name = m.name.padEnd(44, ' ');
      output += `   ${idx}  ${name}${m.description}\n`;
    });
    if (results.length === 0) {
      output += '\nNo results found.';
    }
  } else {
    output = 'Command not supported in mock environment.';
  }

  output +=
    '\n\nSimulated output. Docs: https://docs.metasploit.com/\n' +
    'Ethics: https://www.kali.org/docs/policy/ethical-hacking/';

  return res.status(200).json({ output });
}
