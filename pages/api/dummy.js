export default function handler(req, res) {
  if (req.method === 'POST') {
    const {
      name = '',
      email = '',
      message = '',
    } = req.body || {};
    res.status(200).json({
      ok: true,
      received: {
        name: String(name).slice(0, 100),
        email: String(email).slice(0, 200),
        messageLength: typeof message === 'string' ? message.length : 0,
      },
    });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(405).json({ ok: false, code: 'method_not_allowed' });
}
