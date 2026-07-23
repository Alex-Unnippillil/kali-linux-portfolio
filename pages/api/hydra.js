const allowed = new Set([
  'http',
  'https',
  'ssh',
  'ftp',
  'smtp',
  'http-get',
  'http-post-form',
]);

const MAX_LIST_LINES = 50;

const sanitizeLines = (value) =>
  String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_LIST_LINES);

const mask = (value) => `${value.slice(0, 1)}${'*'.repeat(Math.min(Math.max(value.length - 1, 0), 8))}`;

export default async function handler(req, res) {
  if (
    process.env.FEATURE_TOOL_APIS !== 'enabled' ||
    process.env.FEATURE_HYDRA !== 'enabled'
  ) {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { action, target, service, userList, passList } = req.body || {};

  if (action === 'resume') {
    res.status(200).json({
      output: 'Hydra demo session restored. No network connections or brute-force attempts were made.',
    });
    return;
  }

  if (!target || !service || !userList || !passList) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  if (!allowed.has(service)) {
    res.status(400).json({ error: 'Unsupported service' });
    return;
  }

  const users = sanitizeLines(userList);
  const passwords = sanitizeLines(passList);

  if (!users.length || !passwords.length) {
    res.status(400).json({ error: 'User and password lists must contain demo entries' });
    return;
  }

  const targetLabel = String(target).replace(/[^a-zA-Z0-9 .:_-]/g, '').slice(0, 80) || 'demo-target';
  const sampleAttempts = users.slice(0, 3).flatMap((user) =>
    passwords.slice(0, 2).map((password) => `${user}:${mask(password)}`),
  );

  const output = [
    'Hydra training simulation only',
    `Target label: ${targetLabel}`,
    `Service profile: ${service}`,
    `Credential combinations modeled: ${users.length * passwords.length}`,
    'No sockets were opened and no authentication attempts were sent.',
    '',
    'Sample modeled attempts:',
    ...sampleAttempts.map((attempt) => `  - ${attempt}`),
    '',
    'Result: demo complete. Use this view to discuss rate limits, lockouts, and defensive monitoring.',
  ].join('\n');

  res.status(200).json({ output });
}
