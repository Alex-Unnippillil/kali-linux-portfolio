import type { NextApiRequest, NextApiResponse } from "next";
import {
  getXFeed,
  X_CACHE_SECONDS,
  XFeedError,
} from "../../../lib/x-profile.server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ code: "method_not_allowed" });
  }
  // Reject cache-busting and arbitrary handles before making a billable request.
  if (
    Object.keys(req.query).some((key) => key !== "cursor") ||
    (req.query.cursor !== undefined &&
      (typeof req.query.cursor !== "string" ||
        !req.query.cursor ||
        req.query.cursor.length > 2048))
  ) {
    return res.status(400).json({ code: "invalid_cursor" });
  }
  try {
    const result = await getXFeed(req.query.cursor as string | undefined);
    // Bound total age: an almost-expired warm cache must not get another 15 minutes at the CDN.
    const remaining = Math.max(
      0,
      X_CACHE_SECONDS -
        Math.ceil((Date.now() - Date.parse(result.fetchedAt)) / 1000),
    );
    res.setHeader(
      "Cache-Control",
      `public, max-age=0, s-maxage=${remaining}, must-revalidate`,
    );
    return res.status(200).json(result);
  } catch (error) {
    const failure =
      error instanceof XFeedError ? error : new XFeedError("unavailable");
    const status =
      failure.code === "invalid_cursor"
        ? 400
        : failure.code === "rate_limited"
          ? 429
          : 503;
    res.setHeader("Retry-After", String(failure.retryAfter));
    return res
      .status(status)
      .json({ code: failure.code, retryAfter: failure.retryAfter });
  }
}
