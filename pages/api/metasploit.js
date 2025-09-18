import modules from '../../components/apps/metasploit/modules.json';

export const runtime = 'edge';

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export default async function handler(req) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    return jsonResponse({ error: 'Not implemented' }, 501);
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { command } = body || {};
  if (!command || typeof command !== 'string') {
    return jsonResponse({ error: 'No command provided' }, 400);
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
      if (['name', 'type', 'platform'].includes(field)) {
        return (m[field] || '').toLowerCase().includes(q);
      }
      return (
        m.name.toLowerCase().includes(q) ||
        (m.type || '').toLowerCase().includes(q) ||
        (m.platform || '').toLowerCase().includes(q) ||
        (m.cve || []).some((c) => c.toLowerCase().includes(q)) ||
        m.description.toLowerCase().includes(q)
      );
    });
    let output = 'Matching Modules\n================\n\n   #  Name                                         Description\n   -  --                                         -----------\n';
    results.forEach((m, idx) => {
      const name = m.name.padEnd(44, ' ');
      output += `   ${idx}  ${name}${m.description}\n`;
    });
    if (results.length === 0) {
      output += '\nNo results found.';
    }
    return jsonResponse({ output });
  }

  return jsonResponse({ output: 'Command not supported in mock environment.' });
}
