export const config = { api: { bodyParser: false } };

function parseMultipart(req) {
  return new Promise((resolve) => {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/boundary=(.+)$/);
    if (!match) {
      resolve({ fields: {}, files: [] });
      return;
    }
    const boundary = '--' + match[1];
    let data = '';
    req.setEncoding('binary');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      const result = { fields: {}, files: [] };
      const parts = data
        .split(boundary)
        .filter((p) => p.includes('Content-Disposition'));
      for (const part of parts) {
        const nameMatch = part.match(/name="([^"]+)"/);
        const filenameMatch = part.match(/filename="([^"]+)"/);
        const name = nameMatch && nameMatch[1];
        const start = part.indexOf('\r\n\r\n');
        const content = part.slice(start + 4, part.length - 2);
        if (filenameMatch) {
          result.files.push({ name, filename: filenameMatch[1] });
        } else if (name) {
          result.fields[name] = content;
        }
      }
      resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  let content = '';
  if ((req.headers['content-type'] || '').includes('multipart/form-data')) {
    const { fields, files } = await parseMultipart(req);
    content = fields.text || fields.title || fields.url || files[0]?.filename || '';
  } else {
    const { text, url, title } = req.body || {};
    content = text || url || title || '';
  }
  const params = new URLSearchParams();
  if (content) {
    params.set('text', content);
  }
  res.redirect(307, `/apps/todoist/?${params.toString()}`);
}
