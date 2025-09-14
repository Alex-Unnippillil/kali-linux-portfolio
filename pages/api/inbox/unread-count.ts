export const config = {
  runtime: 'edge',
};

export default function handler(): Response {
  const unread = 3; // demo value
  return new Response(JSON.stringify({ unread }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}
