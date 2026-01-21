import { z } from 'zod';
import johnFixtures from '../../components/apps/john/samples/results.json';
import { checkRateLimit, normalizeIdentifier } from '../../lib/rateLimit';

const johnSchema = z.object({
  hash: z.string().trim().min(1).max(5000),
  rules: z.string().max(2000).optional(),
});

const selectScenario = (hash) => {
  const scenarios = johnFixtures.scenarios || [];
  if (!scenarios.length) return null;
  const score = hash
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = score % scenarios.length;
  return scenarios[index];
};

export default async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }
  // John the Ripper is optional; environments without the binary can stub
  // this handler to return canned responses for demonstration.
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
    payload = johnSchema.parse(req.body || {});
  } catch {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const scenario = selectScenario(payload.hash);
  if (!scenario) {
    res.status(500).json({ error: 'Simulation data unavailable' });
    return;
  }

  const rulesNote = payload.rules?.trim()
    ? `\n[RULES] Applied rule set preview: ${payload.rules.trim().slice(0, 120)}`
    : '';

  res.status(200).json({
    output: `${scenario.output}\n[SIMULATION] ${scenario.summary}${rulesNote}`,
  });
}
