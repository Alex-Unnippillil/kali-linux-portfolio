type WindowPreviewFallbackInput = {
  title: string;
  /**
   * Absolute URL recommended. Relative URLs are not reliably resolved inside a data URL SVG.
   */
  iconUrl?: string | null;
  subtitle?: string | null;
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function buildWindowPreviewFallbackDataUrl(input: WindowPreviewFallbackInput): string {
  const title = escapeXml(input.title || "Window");
  const subtitle = input.subtitle ? escapeXml(input.subtitle) : "";
  const iconUrl = input.iconUrl ? escapeXml(input.iconUrl) : "";

  // 16:9 thumbnail that looks good at 256px wide.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="bar" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#0b1220"/>
    </linearGradient>
    <linearGradient id="panel" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,0.10)"/>
      <stop offset="1" stop-color="rgba(255,255,255,0.03)"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="320" height="180" rx="12" fill="url(#bg)"/>
  <rect x="10" y="10" width="300" height="28" rx="8" fill="url(#bar)" opacity="0.92"/>
  <g opacity="0.9">
    <circle cx="24" cy="24" r="5" fill="#ef4444"/>
    <circle cx="40" cy="24" r="5" fill="#f59e0b"/>
    <circle cx="56" cy="24" r="5" fill="#22c55e"/>
  </g>
  <rect x="14" y="50" width="292" height="116" rx="10" fill="rgba(2,6,23,0.28)" stroke="rgba(255,255,255,0.08)"/>
  <rect x="28" y="66" width="264" height="84" rx="12" fill="url(#panel)" stroke="rgba(255,255,255,0.08)"/>
  ${
    iconUrl
      ? `<image href="${iconUrl}" x="44" y="92" width="36" height="36" />`
      : `<rect x="44" y="92" width="36" height="36" rx="10" fill="rgba(148,163,184,0.16)" stroke="rgba(148,163,184,0.22)" />`
  }
  <text x="92" y="112" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="15" font-weight="750" fill="rgba(255,255,255,0.92)">
    ${title}
  </text>
  ${
    subtitle
      ? `<text x="92" y="132" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="11.5" font-weight="600" fill="rgba(226,232,240,0.68)">
    ${subtitle}
  </text>`
      : `<text x="92" y="132" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="11.5" font-weight="600" fill="rgba(226,232,240,0.62)">
    Preview not available
  </text>`
  }
</svg>`;

  return toDataUrl(svg);
}

type PreviewFilterMode = "normal" | "aggressive";

export function createWindowPreviewFilter(mode: PreviewFilterMode = "normal") {
  const blockedTags = new Set(["IFRAME", "OBJECT", "EMBED"]);
  const aggressiveBlockedTags = new Set([...blockedTags, "VIDEO", "CANVAS"]);

  return (node: unknown) => {
    if (!node || typeof node !== "object") return true;
    const el = node as Element;
    const tagName = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
    const blocked = mode === "aggressive" ? aggressiveBlockedTags : blockedTags;
    if (blocked.has(tagName)) return false;

    // Cross-origin images are one of the most common causes for html-to-image failures.
    // When an <img> can't be fetched with CORS, the underlying canvas becomes tainted and the
    // snapshot throws. Excluding them yields a usable preview of the window chrome/content.
    if ((tagName === "IMG" || tagName === "IMAGE") && typeof (el as HTMLElement).getAttribute === "function") {
      const attr = (el as HTMLElement).getAttribute("src") || (el as HTMLElement).getAttribute("href");
      if (typeof attr === "string" && attr.length) {
        const trimmed = attr.trim();
        const isInline = /^data:|^blob:/i.test(trimmed);
        if (!isInline && typeof window !== "undefined" && window.location?.href) {
          try {
            const url = new URL(trimmed, window.location.href);
            const sameOrigin = window.location?.origin && url.origin === window.location.origin;
            if (!sameOrigin) {
              return false;
            }
          } catch {
            // If we can't parse it, keep it. (Most relative URLs will parse fine.)
          }
        }
      }
    }

    if (typeof el.getAttribute === "function") {
      const explicit = el.getAttribute("data-preview-exclude");
      if (explicit === "true") return false;
    }
    return true;
  };
}


