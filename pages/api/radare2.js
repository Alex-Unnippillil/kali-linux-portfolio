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
  const { action } = req.body || {};

  if (action === 'disasm') {
    return res.status(200).json({ result: 'radare2 disassembly mock' });
  }

  if (action === 'analyze') {
    return res.status(200).json({ result: 'radare2 analysis mock' });
  }

  return res.status(400).json({ error: 'Invalid request' });
}

