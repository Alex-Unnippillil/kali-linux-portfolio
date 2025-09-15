"use client";

let manifestUrl: string | null = null;

export function updateManifestColor(accent: string): void {
  if (typeof document === 'undefined') return;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', accent);
  }
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return;
  fetch('/manifest.webmanifest')
    .then((res) => res.json())
    .then((manifest) => {
      manifest.theme_color = accent;
      manifest.background_color = accent;
      const blob = new Blob([JSON.stringify(manifest)], {
        type: 'application/manifest+json',
      });
      if (manifestUrl) {
        URL.revokeObjectURL(manifestUrl);
      }
      manifestUrl = URL.createObjectURL(blob);
      link.setAttribute('href', manifestUrl);
    })
    .catch(() => {
      /* ignore errors */
    });
}
