export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { name, subject, message } = req.body || {};
  if (!name || !message) {
    res.status(400).json({ error: 'Missing parameters' });
    return;
  }

  const service = process.env.EMAILJS_SERVICE_ID;
  const template = process.env.EMAILJS_TEMPLATE_ID;
  const user = process.env.EMAILJS_PUBLIC_KEY;

  if (!service || !template || !user) {
    res.status(500).json({ error: 'Email service not configured' });
    return;
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: service,
        template_id: template,
        user_id: user,
        template_params: { name, subject, message },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: text });
      return;
    }

    res.status(200).json({ status: 'sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
