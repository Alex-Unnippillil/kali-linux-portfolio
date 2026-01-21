import { z } from 'zod';
import radareSamples from '../../components/apps/radare2/samples/disasm.json';
import { checkRateLimit, normalizeIdentifier } from '../../lib/rateLimit';

const radareSchema = z
  .object({
    action: z.enum(['disasm', 'analyze']),
    hex: z.string().trim().max(20000).optional(),
    file: z.string().trim().max(200000).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.action === 'disasm' && !value.hex) {
      ctx.addIssue({
        code: 'custom',
        message: 'hex is required for disasm',
        path: ['hex'],
      });
    }
    if (value.action === 'analyze' && !value.file) {
      ctx.addIssue({
        code: 'custom',
        message: 'file is required for analyze',
        path: ['file'],
      });
    }
  });

export default async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }
  // Radare2 utilities are optional; this endpoint may be stubbed when the
  // binaries are unavailable.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const identifier = normalizeIdentifier(req);
  const limit = checkRateLimit(identifier, { max: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  let payload;
  try {
    payload = radareSchema.parse(req.body || {});
  } catch (error) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  if (payload.action === 'disasm') {
    return res.status(200).json({ result: radareSamples.disassembly });
  }

  return res.status(200).json({ result: radareSamples.analysis });
}

