export const runtime = 'edge';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(null, {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }

  let payload = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const { text, url, title } = payload || {};
  const content = text || url || title || '';
  const params = new URLSearchParams();
  if (content) {
    params.set('text', content);
  }

  const requestUrl = new URL(req.url);
  const redirectUrl = new URL(`/apps/sticky_notes/?${params.toString()}`, requestUrl.origin);
  return Response.redirect(redirectUrl.toString(), 307);
}
