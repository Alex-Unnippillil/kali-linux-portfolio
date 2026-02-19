import { createClient } from "@supabase/supabase-js";

export default async function handler(
  req,
  res,
) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(503).json({ ok: false, code: "missing_supabase_env" });
    return;
  }

  const { app_slug, event, payload } = req.body || {};
  if (!app_slug || !event) {
    res.status(400).json({ ok: false, code: "invalid_payload" });
    return;
  }

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from("app_events")
    .insert({ app_slug, event, payload: payload ?? null });

  if (error) {
    console.error("track error", error);
    res.status(500).json({ ok: false });
    return;
  }

  res.status(200).json({ ok: true });
}
