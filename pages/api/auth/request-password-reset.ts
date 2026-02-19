import type { NextApiRequest, NextApiResponse } from 'next';
import { createOneTimeToken, findUserByIdentifier } from '../../../lib/auth';
import { requestPasswordResetSchema } from '../../../utils/authSchemas';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  const parsed = requestPasswordResetSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: 'invalid_input' });
    return;
  }

  const user = await findUserByIdentifier(parsed.data.email);
  let resetPreview: string | undefined;
  if (user) {
    const reset = await createOneTimeToken(user.id, 'password_reset');
    if (process.env.NODE_ENV !== 'production') {
      resetPreview = reset.token ?? undefined;
    }
  }

  res.status(200).json({
    ok: true,
    resetPreview,
    message: 'If an account exists for that email, a password reset link was generated.',
  });
}
