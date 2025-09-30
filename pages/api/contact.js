import {
  generateCsrfToken,
  handleContactSubmission,
  mapCodeToStatus,
  rateLimit,
  RATE_LIMIT_WINDOW_MS,
} from '@/services/contactSubmission';

// Re-export for existing tests that import these helpers directly.
export { rateLimit, RATE_LIMIT_WINDOW_MS };

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const token = generateCsrfToken();
    res.setHeader(
      'Set-Cookie',
      `csrfToken=${token}; HttpOnly; Path=/; SameSite=Strict`,
    );
    res.status(200).json({ ok: true, csrfToken: token });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false });
    return;
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const result = await handleContactSubmission(
    {
      name: req.body?.name || '',
      email: req.body?.email || '',
      message: req.body?.message || '',
      honeypot: req.body?.honeypot || '',
      csrfToken: req.headers['x-csrf-token'] || '',
      recaptchaToken: req.body?.recaptchaToken || '',
    },
    {
      ip,
      csrfCookie: req.cookies?.csrfToken || '',
    },
  );

  if (result.success) {
    res.status(200).json({ ok: true });
    return;
  }

  const status = result.status ?? mapCodeToStatus(result.code);
  res.status(status).json({ ok: false, code: result.code });
}

