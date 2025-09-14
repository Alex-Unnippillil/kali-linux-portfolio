export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const formData = await req.formData();
  const title = formData.get('title')?.toString() || '';
  const text = formData.get('text')?.toString() || '';
  const url = formData.get('url')?.toString() || '';
  const files = formData.getAll('files');

  console.log('Received share', {
    title,
    text,
    url,
    files: files.map((f) => (typeof f === 'object' && 'name' in f ? f.name : String(f))),
  });

  return new Response(null, {
    status: 302,
    headers: { Location: '/inbox' },
  });
}
