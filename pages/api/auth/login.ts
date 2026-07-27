import type { NextApiRequest, NextApiResponse } from 'next';
import {
  createSession,
  createSessionCookie,
  findUserByIdentifier,
  verifyPassword,
} from '../../../lib/auth';
import { loginSchema } from '../../../utils/authSchemas';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  const parsed = loginSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: 'invalid_input' });
    return;
  }

  const user = await findUserByIdentifier(parsed.data.identifier);
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) {
    res.status(401).json({ ok: false, code: 'invalid_credentials', message: 'Incorrect email/username or password.' });
    return;
  }

  if (!user.is_email_verified) {
    res.status(403).json({ ok: false, code: 'email_unverified', message: 'Please verify your email before signing in.' });
    return;
  }

  const session = await createSession(user.id);
  if (!session.token) {
    res.status(503).json({ ok: false, code: 'session_unavailable' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie(session.token));
  res.status(200).json({ ok: true, user: { id: user.id, username: user.username, email: user.email } });
}
