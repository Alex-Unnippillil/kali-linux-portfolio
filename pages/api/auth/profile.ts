import type { NextApiRequest, NextApiResponse } from 'next';
import { getProfile, getSessionCookieFromHeader, getUserBySessionToken, updateProfile } from '../../../lib/auth';
import { profilePatchSchema } from '../../../utils/authSchemas';

async function authenticate(req: NextApiRequest) {
  const token = getSessionCookieFromHeader(req.headers.cookie);
  return getUserBySessionToken(token);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await authenticate(req);
  if (!user) {
    res.status(401).json({ ok: false, code: 'unauthorized' });
    return;
  }

  if (req.method === 'GET') {
    const profile = await getProfile(user.id);
    res.status(200).json({
      ok: true,
      user: { id: user.id, username: user.username, email: user.email, isEmailVerified: user.is_email_verified },
      profile,
    });
    return;
  }

  if (req.method === 'PATCH') {
    const parsed = profilePatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ ok: false, code: 'invalid_input', errors: parsed.error.flatten() });
      return;
    }
    const profile = await updateProfile(user.id, parsed.data);
    res.status(200).json({ ok: true, profile });
    return;
  }

  res.status(405).json({ ok: false, code: 'method_not_allowed' });
}
