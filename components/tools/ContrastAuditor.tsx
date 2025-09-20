"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEVTOOLS_IGNORE_ATTR,
  auditDocument,
  type ContrastReport,
} from '../../utils/colorAudit';
import { useDeveloperTools } from '../../hooks/useDeveloperTools';

const PANEL_MAX_HEIGHT = '60vh';

const ContrastAuditor = (): JSX.Element | null => {
  const { tools, setTool } = useDeveloperTools();
  const [reports, setReports] = useState<ContrastReport[]>([]);

  const runAudit = useCallback(() => {
    if (typeof document === 'undefined') return;
    const nextReports = auditDocument(document);
    setReports(nextReports);
  }, []);

  useEffect(() => {
    if (!tools.contrastAuditor) {
      setReports([]);
      return;
    }

    runAudit();

    const handle = () => {
      window.requestAnimationFrame(runAudit);
    };

    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);

    const observer = new MutationObserver(handle);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
      observer.disconnect();
    };
  }, [runAudit, tools.contrastAuditor]);

  const ignoreAttr = useMemo(
    () => ({ [DEVTOOLS_IGNORE_ATTR]: 'true' } as Record<string, string>),
    [],
  );

  if (!tools.contrastAuditor) {
    return null;
  }

  const violationSummary =
    reports.length > 0
      ? `${reports.length} text block${reports.length === 1 ? '' : 's'} below WCAG thresholds`
      : 'No violations detected';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1200]"
      {...ignoreAttr}
      aria-hidden="true"
    >
      {reports.map((report, index) => (
        <div
          key={`${report.selector}-${index}`}
          className="absolute pointer-events-none border border-red-500/80 bg-red-500/10"
          style={{
            top: report.bounding.top,
            left: report.bounding.left,
            width: report.bounding.width,
            height: report.bounding.height,
          }}
          {...ignoreAttr}
        >
          <div
            className="absolute -top-6 left-0 px-2 py-1 bg-red-600 text-xs text-white rounded shadow pointer-events-none"
            {...ignoreAttr}
          >
            {report.ratio.toFixed(2)} : 1
          </div>
        </div>
      ))}

      <aside
        className="pointer-events-auto fixed bottom-4 right-4 w-80 max-w-full text-sm bg-ub-grey/95 text-white rounded-md border border-white/20 shadow-lg"
        {...ignoreAttr}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <h2 className="text-base font-semibold">Contrast auditor</h2>
            <p className="text-xs text-ubt-warm-grey">{violationSummary}</p>
          </div>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => setTool('contrastAuditor', false)}
          >
            Close
          </button>
        </div>
        <div
          className="px-4 py-3 space-y-3 overflow-y-auto"
          style={{ maxHeight: PANEL_MAX_HEIGHT }}
        >
          <button
            type="button"
            className="text-xs px-2 py-1 bg-black/30 rounded"
            onClick={runAudit}
          >
            Re-run analysis
          </button>
          {reports.length === 0 ? (
            <p className="text-xs text-ubt-warm-grey">
              All sampled text meets the minimum contrast requirement.
            </p>
          ) : (
            <ul className="space-y-3">
              {reports.map((report, index) => (
                <li key={`${report.selector}-summary-${index}`} className="border border-white/10 rounded p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs break-all">{report.selector}</span>
                    <span className="text-xs font-semibold text-red-300">
                      {report.ratio.toFixed(2)} : 1
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ubt-warm-grey">
                    {report.text}
                  </p>
                  <p className="mt-2 text-xs">
                    <span className="block">Foreground: {report.foreground}</span>
                    <span className="block">Background: {report.background}</span>
                    <span className="block">
                      Required: {report.threshold.toFixed(1)} : 1
                    </span>
                  </p>
                  {report.tokenLink && (
                    <a
                      href={report.tokenLink.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-ubt-blue underline"
                    >
                      View token {report.tokenLink.token}
                    </a>
                  )}
                  {report.suggestions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-ubt-warm-grey">Suggested tokens:</p>
                      <ul className="mt-1 space-y-1">
                        {report.suggestions.map(token => (
                          <li key={token.token}>
                            <a
                              href={token.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-ubt-blue underline"
                            >
                              {token.token} · {token.value}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
};

export default ContrastAuditor;
