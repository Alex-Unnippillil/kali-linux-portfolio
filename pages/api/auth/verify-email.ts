import type { NextApiRequest, NextApiResponse } from 'next';
import { consumeToken, markEmailVerified } from '../../../lib/auth';
import { verifyEmailSchema } from '../../../utils/authSchemas';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  const parsed = verifyEmailSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: 'invalid_input' });
    return;
  }

  const token = await consumeToken(parsed.data.token, 'email_verification');
  if (!token) {
    res.status(400).json({ ok: false, code: 'invalid_or_expired_token' });
    return;
  }

  await markEmailVerified(token.user_id);
  res.status(200).json({ ok: true, message: 'Email verified. You can now sign in.' });
}
