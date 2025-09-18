import modules from '../../components/apps/mimikatz/modules.json';

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

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const command = url.searchParams.get('command');
    if (command) {
      return jsonResponse({ output: `Executed ${command}` });
    }
    return jsonResponse({ modules });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const { script } = body || {};
    if (!script) {
      return jsonResponse({ error: 'No script provided' }, 400);
    }
    return jsonResponse({ output: `Executed script: ${script}` });
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'GET, POST' },
  });
}
