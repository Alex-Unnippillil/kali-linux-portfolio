'use client';

import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';

interface Payload {
  name: string;
  code: string;
}

const payloads: Payload[] = [
  { name: 'Alert Box', code: "alert('BeEF demo payload');" },
  { name: 'Console Log', code: "console.log('BeEF demo payload executed');" },
  {
    name: 'Change Background',
    code: "document.body.style.background='lightyellow';",
  },
];

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type MitigationKey = 'escapeReflected' | 'sanitizeStored' | 'enforceCsp';

export default function PayloadBuilder() {
  const [selected, setSelected] = useState<Payload>(payloads[0]);
  const [copied, setCopied] = useState(false);
  const [mitigations, setMitigations] = useState<
    Record<MitigationKey, boolean>
  >({
    escapeReflected: false,
    sanitizeStored: false,
    enforceCsp: false,
  });

  const toggleMitigation = (key: MitigationKey) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMitigations((prev) => ({ ...prev, [key]: event.target.checked }));
    };

  const attributePayload = useMemo(
    () => escapeAttribute(`this.onerror=null; ${selected.code}`),
    [selected.code],
  );

  const attackFragment = useMemo(
    () =>
      `<img src="invalid" alt="payload" class="payload-img" onerror="${attributePayload}" />`,
    [attributePayload],
  );

  const safeFragmentText = useMemo(
    () => escapeHtml(attackFragment),
    [attackFragment],
  );

  const reflectedHtml = useMemo(() => {
    const snippet = mitigations.escapeReflected ? safeFragmentText : attackFragment;
    return `Showing results for "<code class=\"payload-text\">${snippet}</code>"`;
  }, [attackFragment, mitigations.escapeReflected, safeFragmentText]);

  const storedListUnsafe = useMemo(
    () =>
      `<ul class="guestbook">
        <li><strong>Admin</strong>: Welcome to the demo guestbook.</li>
        <li><strong>New Visitor</strong>: ${attackFragment}</li>
        <li><strong>Moderator</strong>: Thanks for keeping it friendly.</li>
      </ul>`,
    [attackFragment],
  );

  const storedHtml = useMemo(
    () =>
      mitigations.sanitizeStored
        ? DOMPurify.sanitize(storedListUnsafe)
        : storedListUnsafe,
    [mitigations.sanitizeStored, storedListUnsafe],
  );

  const cspContent =
    "default-src 'self'; script-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'none';";

  const cspMetaTag = useMemo(
    () =>
      `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`,
    [cspContent],
  );

  const iframeHtml = useMemo(() => {
    const reflectedSection = `<section class="panel"><h2>Reflected search</h2><div class="reflected">${reflectedHtml}</div></section>`;
    const storedSection = `<section class="panel"><h2>Stored guestbook</h2>${storedHtml}</section>`;
    const executionSection = mitigations.enforceCsp
      ? `<section class="panel"><h2>Execution result</h2><p>CSP active: inline scripts are blocked in this document.</p></section>`
      : `<section class="panel"><h2>Execution result</h2><p>Inline script executes while mitigations are disabled.</p></section><script>${selected.code}</script>`;
    const styles = `body{font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:16px;}h1{font-size:1.35rem;margin-bottom:16px;}code{background:#1f2937;color:#38bdf8;padding:2px 4px;border-radius:4px;} .panel{background:#1e293b;border-radius:10px;padding:14px;margin-bottom:14px;box-shadow:0 8px 16px rgba(15,23,42,0.35);} .panel h2{margin:0 0 8px;font-size:1rem;} .guestbook{list-style:disc;padding-left:20px;} .guestbook li{margin-bottom:4px;} .payload-img{max-width:32px;margin-left:4px;vertical-align:middle;} .reflected{font-size:0.95rem;}`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>${
      mitigations.enforceCsp ? cspMetaTag : ''
    }<title>Payload Harness</title><style>${styles}</style></head><body><h1>Harness Preview</h1>${reflectedSection}${storedSection}${executionSection}</body></html>`;
  }, [
    cspMetaTag,
    mitigations.enforceCsp,
    reflectedHtml,
    selected.code,
    storedHtml,
  ]);

  const copyPage = async () => {
    try {
      await navigator.clipboard.writeText(iframeHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = payloads.find((p) => p.name === e.target.value);
    setSelected(next || payloads[0]);
  };

  const activeBadges = useMemo(() => {
    const badges = [] as string[];
    if (mitigations.escapeReflected) badges.push('HTML escaping');
    if (mitigations.sanitizeStored) badges.push('DOMPurify sanitization');
    if (mitigations.enforceCsp) badges.push('CSP snippet');
    return badges;
  }, [mitigations]);

  const cspHeader = useMemo(
    () => `Content-Security-Policy: ${cspContent}`,
    [cspContent],
  );

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="payloadSelect" className="text-xs uppercase">
          Payload
        </label>
        <select
          id="payloadSelect"
          value={selected.name}
          onChange={handleSelect}
          className="rounded px-2 py-1 text-black"
        >
          {payloads.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={copyPage}
          className="rounded bg-ub-gray-50 px-3 py-1 text-black transition hover:bg-white"
        >
          {copied ? 'Copied!' : 'Copy HTML'}
        </button>
      </div>

      <div className="rounded-lg border border-ub-gray-70 bg-ub-gray-90 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Mitigations
          </span>
          <div className="flex flex-wrap gap-2">
            {activeBadges.length ? (
              activeBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-200"
                >
                  {badge}
                </span>
              ))
            ) : (
              <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">
                No defences active
              </span>
            )}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent bg-transparent p-2 transition hover:border-ub-gray-60">
            <input
              type="checkbox"
              checked={mitigations.escapeReflected}
              onChange={toggleMitigation('escapeReflected')}
              className="mt-1 h-4 w-4 rounded border-slate-500 text-emerald-400 focus:ring-emerald-400"
            />
            <span className="space-y-1 text-xs text-slate-200">
              <span className="block font-semibold text-slate-100">
                Escape reflected output
              </span>
              <span className="block text-[0.7rem] text-slate-400">
                Converts the payload snippet to text before echoing it back in the simulated search result.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent bg-transparent p-2 transition hover:border-ub-gray-60">
            <input
              type="checkbox"
              checked={mitigations.sanitizeStored}
              onChange={toggleMitigation('sanitizeStored')}
              className="mt-1 h-4 w-4 rounded border-slate-500 text-emerald-400 focus:ring-emerald-400"
            />
            <span className="space-y-1 text-xs text-slate-200">
              <span className="block font-semibold text-slate-100">
                Sanitize stored content
              </span>
              <span className="block text-[0.7rem] text-slate-400">
                Runs DOMPurify over guestbook posts to strip executable attributes before rendering.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent bg-transparent p-2 transition hover:border-ub-gray-60">
            <input
              type="checkbox"
              checked={mitigations.enforceCsp}
              onChange={toggleMitigation('enforceCsp')}
              className="mt-1 h-4 w-4 rounded border-slate-500 text-emerald-400 focus:ring-emerald-400"
            />
            <span className="space-y-1 text-xs text-slate-200">
              <span className="block font-semibold text-slate-100">
                Inject CSP snippet
              </span>
              <span className="block text-[0.7rem] text-slate-400">
                Adds a strict Content-Security-Policy meta tag so inline scripts are blocked inside the iframe preview.
              </span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="payload-html" className="text-xs uppercase text-slate-300">
          Generated harness markup
        </label>
        <textarea
          id="payload-html"
          value={iframeHtml}
          readOnly
          rows={10}
          className="w-full rounded border border-ub-gray-70 bg-white p-2 font-mono text-xs text-black"
        />
        <p className="text-[0.7rem] text-slate-400">
          Copy the HTML to host the harness elsewhere or inspect how each mitigation rewrites the simulated page.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
          CSP preview
        </p>
        <div className="rounded border border-ub-gray-70 bg-ub-gray-90 p-3 text-xs text-slate-200">
          {mitigations.enforceCsp ? (
            <>
              <p className="font-semibold text-slate-100">Meta tag</p>
              <code className="block whitespace-pre-wrap break-words text-[0.7rem] text-emerald-200">
                {cspMetaTag}
              </code>
              <p className="mt-2 font-semibold text-slate-100">Header variant</p>
              <code className="block whitespace-pre-wrap break-words text-[0.7rem] text-emerald-200">
                {cspHeader}
              </code>
              <p className="mt-2 text-[0.7rem] text-slate-400">
                Both snippets are applied before the iframe refreshes so inline payloads are refused.
              </p>
            </>
          ) : (
            <p className="text-[0.7rem] text-slate-400">
              Enable the CSP toggle above to inject a restrictive policy and demonstrate how blocking inline scripts prevents the payload execution.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-lg border border-ub-gray-70 bg-ub-gray-90 p-3">
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Reflected search result</h3>
              <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">
                {mitigations.escapeReflected ? 'Escaped output' : 'Raw injection'}
              </span>
            </header>
            <p className="mb-2 text-[0.7rem] text-slate-400">
              {mitigations.escapeReflected
                ? 'Escaping turns the payload into inert text so the simulated onerror handler never runs.'
                : 'Without escaping the payload executes as soon as the image element errors.'}
            </p>
            <div
              className="rounded border border-ub-gray-60 bg-slate-950/40 p-3 text-xs text-slate-200"
              dangerouslySetInnerHTML={{ __html: reflectedHtml }}
            />
          </section>

          <section className="rounded-lg border border-ub-gray-70 bg-ub-gray-90 p-3">
            <header className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Stored guestbook</h3>
              <span className="text-[0.65rem] uppercase tracking-wide text-slate-400">
                {mitigations.sanitizeStored ? 'Sanitized' : 'Unsafe rendering'}
              </span>
            </header>
            <p className="mb-2 text-[0.7rem] text-slate-400">
              {mitigations.sanitizeStored
                ? 'DOMPurify strips dangerous attributes before the entry is re-rendered, keeping the guestbook benign.'
                : 'Guestbook posts are rendered verbatim, allowing stored payloads to execute when the page loads.'}
            </p>
            <div
              className="rounded border border-ub-gray-60 bg-slate-950/40 p-3 text-xs text-slate-200"
              dangerouslySetInnerHTML={{ __html: storedHtml }}
            />
          </section>
        </div>
        <section className="flex flex-col gap-3 rounded-lg border border-ub-gray-70 bg-ub-gray-90 p-3">
          <header className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-slate-100">Iframe preview</h3>
            <p className="text-[0.7rem] text-slate-400">
              The preview reloads whenever you change mitigations to mirror the escaped markup and CSP headers applied inside the sandboxed document.
            </p>
          </header>
          <div className="flex-1 overflow-hidden rounded border border-ub-gray-60 bg-black/60">
            <iframe
              key={iframeHtml}
              title="payload-preview"
              sandbox="allow-scripts"
              srcDoc={iframeHtml}
              className="h-full w-full border-0"
            />
          </div>
          <p className="text-[0.7rem] text-slate-400">
            The iframe is sandboxed with scripts enabled so payloads only execute when not neutralized by the selected defences.
          </p>
        </section>
      </div>
    </div>
  );
}
