export default async function handler(
  req,
  res,
) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  const { app_slug, event, payload } = req.body || {};
  if (!app_slug || !event) {
    res.status(400).json({ ok: false, code: "invalid_payload" });
    return;
  }

  console.info("demo track event", { app_slug, event, payload });
  res.status(200).json({ ok: true });
}
