import { z } from 'zod';
import hydraFixtures from '../../components/apps/hydra/samples/results.json';
import { checkRateLimit, normalizeIdentifier } from '../../lib/rateLimit';

const allowed = [
  'http',
  'https',
  'ssh',
  'ftp',
  'smtp',
  'http-get',
  'http-post-form',
];

const hydraSchema = z.object({
  action: z.enum(['run', 'resume']).optional(),
  target: z.string().trim().min(1).max(200),
  service: z.enum(allowed),
  userList: z.string().min(1).max(5000),
  passList: z.string().min(1).max(5000),
});

const formatOutput = (service, action) => {
  const entries = hydraFixtures.outputs || {};
  if (action === 'resume' && entries.resume) {
    return entries.resume;
  }
  return entries[service] || entries.default;
};

export default async function handler(req, res) {
  if (
    process.env.FEATURE_TOOL_APIS !== 'enabled' ||
    process.env.FEATURE_HYDRA !== 'enabled'
  ) {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }
  // Hydra is an optional external dependency. Environments without the
  // actual binary may stub this handler for demonstration purposes.
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const identifier = normalizeIdentifier(req);
  const limit = checkRateLimit(identifier, { max: 5, windowMs: 60_000 });
  if (!limit.allowed) {
    res.status(429).json({ error: 'Rate limit exceeded' });
    return;
  }

  let payload;
  try {
    payload = hydraSchema.parse(req.body || {});
  } catch (error) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const { action = 'run', service, target } = payload;
  const simulated = formatOutput(service, action);
  res.status(200).json({
    output: `${simulated}\n[SIMULATION] Target: ${target} | Service: ${service}`,
  });
}
