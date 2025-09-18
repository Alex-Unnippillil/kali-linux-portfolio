export type PasteMode = "keep" | "plain" | "clean-url" | "code-block";

export const PASTE_MODE_METADATA: Record<
  PasteMode,
  { label: string; description: string }
> = {
  keep: {
    label: "Keep formatting",
    description: "Paste exactly what was copied without modification.",
  },
  plain: {
    label: "Plain text",
    description: "Strip rich text, HTML, and smart quotes before pasting.",
  },
  "clean-url": {
    label: "Clean URL",
    description: "Remove tracking parameters and collapse whitespace in URLs.",
  },
  "code-block": {
    label: "Code block",
    description: "Wrap content in a fenced Markdown code block.",
  },
};

export const DEFAULT_TRACKING_QUERY_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "yclid",
  "_hsenc",
  "_hsmi",
  "mkt_tok",
  "vero_id",
];

export const DEFAULT_TRACKING_HASH_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
];

export interface TrackingParameterLists {
  query: string[];
  hash: string[];
}

const STORAGE_KEY = "clipboard-tracking-params";

const normalizeList = (list: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of list) {
    const value = entry.trim();
    if (!value) continue;
    const lower = value.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(lower);
  }
  return result;
};

const parseStoredLists = (raw: unknown): TrackingParameterLists | null => {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<TrackingParameterLists>;
  if (!Array.isArray(value.query) || !Array.isArray(value.hash)) return null;
  return {
    query: normalizeList(value.query.filter((item): item is string => typeof item === "string")),
    hash: normalizeList(value.hash.filter((item): item is string => typeof item === "string")),
  };
};

export const getDefaultTrackingParameterLists = (): TrackingParameterLists => ({
  query: [...DEFAULT_TRACKING_QUERY_PARAMS],
  hash: [...DEFAULT_TRACKING_HASH_PARAMS],
});

export const loadTrackingParameterLists = (): TrackingParameterLists => {
  if (typeof window === "undefined") {
    return getDefaultTrackingParameterLists();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultTrackingParameterLists();
    const parsed = JSON.parse(raw);
    const lists = parseStoredLists(parsed);
    return lists ?? getDefaultTrackingParameterLists();
  } catch {
    return getDefaultTrackingParameterLists();
  }
};

export const saveTrackingParameterLists = (
  lists: TrackingParameterLists,
): TrackingParameterLists => {
  const normalized: TrackingParameterLists = {
    query: normalizeList(lists.query),
    hash: normalizeList(lists.hash),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore persistence failures
    }
  }
  return normalized;
};

export const resetTrackingParameterLists = (): TrackingParameterLists => {
  const defaults = getDefaultTrackingParameterLists();
  saveTrackingParameterLists(defaults);
  return defaults;
};

const htmlToText = (value: string): string => {
  if (typeof window !== "undefined") {
    const div = window.document.createElement("div");
    div.innerHTML = value;
    return div.textContent ?? div.innerText ?? "";
  }
  return value
    .replace(/<br\s*\/?>(\r?\n)?/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
};

export interface SanitizationResult {
  mode: PasteMode;
  original: string;
  sanitized: string;
  wasModified: boolean;
  removedTrackingParameters?: string[];
  strippedHtml?: boolean;
  wrappedInCodeBlock?: boolean;
}

interface SanitizeOptions {
  trackingParameters?: TrackingParameterLists;
  html?: string;
}

export const sanitizeClipboardText = (
  text: string,
  mode: PasteMode,
  options: SanitizeOptions = {},
): SanitizationResult => {
  const original = text;
  const tracking = options.trackingParameters ?? loadTrackingParameterLists();
  const result: SanitizationResult = {
    mode,
    original,
    sanitized: text,
    wasModified: false,
  };

  if (mode === "keep") {
    return result;
  }

  if (mode === "plain") {
    const candidate = options.html && options.html.trim() ? options.html : text;
    const converted = htmlToText(candidate)
      .replace(/\u00a0/g, " ")
      .replace(/\r\n/g, "\n");
    if (converted !== text) {
      result.sanitized = converted;
      result.wasModified = true;
      result.strippedHtml = candidate !== text;
    }
    return result;
  }

  if (mode === "code-block") {
    const trimmed = text.trimEnd();
    if (/^```/.test(trimmed) && /```\s*$/.test(trimmed)) {
      result.sanitized = trimmed;
      return result;
    }
    result.sanitized = ["```", trimmed, "```"].join("\n");
    result.wasModified = true;
    result.wrappedInCodeBlock = true;
    return result;
  }

  // Clean URL
  const trimmed = text.trim();
  try {
    const url = new URL(trimmed);
    const removed = new Set<string>();
    const queryParams = tracking.query;
    for (const key of queryParams) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        removed.add(key);
      }
    }
    const hash = url.hash.replace(/^#/, "");
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      for (const key of tracking.hash) {
        if (hashParams.has(key)) {
          hashParams.delete(key);
          removed.add(key);
        }
      }
      const hashString = hashParams.toString();
      url.hash = hashString ? `#${hashString}` : "";
    }
    url.search = url.searchParams.toString();
    const cleaned = url.toString();
    if (cleaned !== trimmed || removed.size > 0) {
      result.sanitized = cleaned;
      result.wasModified = cleaned !== original;
      result.removedTrackingParameters = [...removed];
    } else {
      result.sanitized = trimmed;
    }
    return result;
  } catch {
    // Not a valid URL; fall back to trimming whitespace only
    const collapsed = trimmed.replace(/\s+/g, " ");
    if (collapsed !== text) {
      result.sanitized = collapsed;
      result.wasModified = true;
    }
    return result;
  }
};

export const summarizeSanitization = (
  result: SanitizationResult,
): string | null => {
  if (!result.wasModified) return null;
  switch (result.mode) {
    case "plain":
      return "Converted clipboard contents to plain text.";
    case "clean-url": {
      if (result.removedTrackingParameters?.length) {
        return `Removed tracking parameters: ${result.removedTrackingParameters.join(", ")}.`;
      }
      return "Normalized URL formatting.";
    }
    case "code-block":
      return "Wrapped clipboard contents in a code block.";
    default:
      return "Adjusted clipboard contents to match paste policy.";
  }
};
