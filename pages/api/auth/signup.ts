import type { NextApiRequest, NextApiResponse } from 'next';
import { createOneTimeToken, createUser } from '../../../lib/auth';
import { signupSchema } from '../../../utils/authSchemas';

const genericError = { ok: false, code: 'signup_failed', message: 'Unable to create account.' };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  const parsed = signupSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: 'invalid_input', errors: parsed.error.flatten() });
    return;
  }

  const { user, error } = await createUser(parsed.data);
  if (!user || error) {
    const duplicateCodes = ['duplicate_user', '23505', 'duplicate key'];
    if (duplicateCodes.some((code) => String(error).toLowerCase().includes(code))) {
      res.status(409).json({ ok: false, code: 'account_exists', message: 'An account already exists for this username or email.' });
      return;
    }
    res.status(503).json(genericError);
    return;
  }

  const verification = await createOneTimeToken(user.id, 'email_verification');
  const verificationPreview = process.env.NODE_ENV !== 'production' ? verification.token : undefined;

  res.status(201).json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isEmailVerified: user.is_email_verified,
    },
    verificationPreview,
    message: 'Account created. Verify your email before logging in.',
  });
}
