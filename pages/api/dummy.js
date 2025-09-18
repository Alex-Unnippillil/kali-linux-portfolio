export const runtime = 'edge';

export default async function handler(req) {
  if (req.method === 'POST') {
    return new Response(JSON.stringify({ message: 'Received' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      Allow: 'POST',
    },
  });
}
