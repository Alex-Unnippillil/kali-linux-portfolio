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
  const { hash } = req.body || {};
  if (!hash) {
    res.status(400).json({ error: 'No hash provided' });
    return;
  }

  // Return mock output instead of executing john
  res.status(200).json({ output: 'john mock output' });
}
