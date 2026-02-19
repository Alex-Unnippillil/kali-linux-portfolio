import type { NextApiRequest, NextApiResponse } from 'next';
import { consumeToken, updatePassword } from '../../../lib/auth';
import { resetPasswordSchema } from '../../../utils/authSchemas';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'method_not_allowed' });
    return;
  }

  const parsed = resetPasswordSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ ok: false, code: 'invalid_input', errors: parsed.error.flatten() });
    return;
  }

  const token = await consumeToken(parsed.data.token, 'password_reset');
  if (!token) {
    res.status(400).json({ ok: false, code: 'invalid_or_expired_token' });
    return;
  }

  await updatePassword(token.user_id, parsed.data.newPassword);
  res.status(200).json({ ok: true, message: 'Password updated successfully.' });
}
