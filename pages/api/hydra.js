const allowed = new Set(['http', 'https', 'ssh', 'ftp', 'smtp']);

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

  const { action, target, service, userList, passList } = req.body || {};

  if (action === 'resume') {
    res.status(200).json({ output: 'hydra resume mock' });
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

  res.status(200).json({ output: 'hydra mock' });
}
