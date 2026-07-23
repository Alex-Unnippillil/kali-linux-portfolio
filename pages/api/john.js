const HASH_PATTERNS = [
  { name: 'MD5-like', regex: /^[a-f0-9]{32}$/i },
  { name: 'SHA1-like', regex: /^[a-f0-9]{40}$/i },
  { name: 'SHA256-like', regex: /^[a-f0-9]{64}$/i },
  { name: 'bcrypt-like', regex: /^\$2[aby]\$\d{2}\$/ },
];

export default async function handler(req, res) {
  if (process.env.FEATURE_TOOL_APIS !== 'enabled') {
    res.status(501).json({ error: 'Not implemented' });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { hash } = req.body || {};
  if (typeof hash !== 'string' || !hash.trim()) {
    res.status(400).json({ error: 'No hash provided' });
    return;
  }

  const normalized = hash.trim().slice(0, 200);
  const detected = HASH_PATTERNS.find((pattern) => pattern.regex.test(normalized));
  const output = [
    'John the Ripper training simulation only',
    `Detected format: ${detected?.name || 'unknown demo hash'}`,
    `Input length: ${normalized.length} characters`,
    'No cracking process was started and no wordlists were read.',
    'Result: review hash hygiene, salting, and password policy controls with this canned analysis.',
  ].join('\n');

  res.status(200).json({ output });
}
