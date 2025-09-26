import { createClient } from "@supabase/supabase-js";
import logger from "../../utils/logger";

const trackLogger = logger.createApiLogger("track");

export default async function handler(
  req,
  res,
) {
  const completeRequest = trackLogger.startTimer({ method: req.method });

  if (req.method !== "POST") {
    res.status(405).json({ ok: false });
    completeRequest({ status: 405, code: "method_not_allowed" });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({ ok: false, code: "missing_supabase_env" });
    completeRequest({ status: 500, code: "missing_supabase_env" });
    return;
  }

  const { app_slug, event, payload } = req.body || {};
  if (!app_slug || !event) {
    res.status(400).json({ ok: false, code: "invalid_payload" });
    completeRequest({ status: 400, code: "invalid_payload" });
    return;
  }

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from("app_events")
    .insert({ app_slug, event, payload: payload ?? null });

  if (error) {
    trackLogger.error("track error", { error: error.message });
    res.status(500).json({ ok: false });
    completeRequest({ status: 500, code: "supabase_insert_failed" });
    return;
  }

  res.status(200).json({ ok: true });
  completeRequest({ status: 200 });
}
