const COOKIE_NAME = 'portfolio_session';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

const createCookie = (value: string, maxAge: number) =>
  `${COOKIE_NAME}=${value}; HttpOnly; Secure; Path=/; Max-Age=${maxAge}`;

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return new Response(
      JSON.stringify({ error: 'Username and password required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createCookie('1', MAX_AGE_SECONDS),
    },
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createCookie('', 0),
    },
  });
}
