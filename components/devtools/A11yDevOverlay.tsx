'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useRouter } from 'next/router';
import type { Result as AxeViolation } from 'axe-core';

const severityOrder: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

const severityColor: Record<string, string> = {
  critical: '#dc2626',
  serious: '#ea580c',
  moderate: '#ca8a04',
  minor: '#16a34a',
};

const shouldEnableOverlay = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const flag = process.env.NEXT_PUBLIC_ENABLE_A11Y_OVERLAY;

  if (process.env.NODE_ENV !== 'production') {
    return flag !== 'false';
  }

  return flag === 'true';
};

const formatImpact = (impact?: AxeViolation['impact']) => {
  if (!impact) {
    return 'minor';
  }
  return impact;
};

const formatTimestamp = (timestamp: string | null) => {
  if (!timestamp) {
    return 'pending scan';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'pending scan';
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const truncateHtml = (html: string | undefined) => {
  if (!html) {
    return '';
  }
  const clean = html.replace(/\s+/g, ' ').trim();
  if (clean.length <= 140) {
    return clean;
  }
  return `${clean.slice(0, 140)}…`;
};

const panelContainerStyle: CSSProperties = {
  position: 'fixed',
  bottom: '1.5rem',
  right: '1.5rem',
  zIndex: 2147483647,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: '13px',
  color: '#0f172a',
};

const toggleButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  borderRadius: '9999px',
  border: '1px solid rgba(15,23,42,0.15)',
  background: '#f8fafc',
  padding: '0.4rem 0.9rem',
  boxShadow: '0 4px 12px rgba(15,23,42,0.12)',
  cursor: 'pointer',
};

const panelStyle: CSSProperties = {
  marginTop: '0.75rem',
  width: '380px',
  maxHeight: '65vh',
  overflow: 'hidden',
  borderRadius: '0.75rem',
  border: '1px solid rgba(15,23,42,0.15)',
  background: '#ffffff',
  boxShadow: '0 16px 40px rgba(15,23,42,0.18)',
  display: 'flex',
  flexDirection: 'column',
};

const panelHeaderStyle: CSSProperties = {
  padding: '0.9rem 1rem',
  borderBottom: '1px solid rgba(15,23,42,0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  background: '#f1f5f9',
};

const panelBodyStyle: CSSProperties = {
  padding: '0.75rem 1rem 1rem',
  overflowY: 'auto',
  flex: 1,
};

const pillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: '9999px',
  padding: '0.1rem 0.55rem',
  fontWeight: 600,
  fontSize: '12px',
  color: '#ffffff',
  textTransform: 'capitalize',
};

const badgeListStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.35rem',
};

const rescanButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  borderRadius: '9999px',
  border: '1px solid rgba(15,23,42,0.12)',
  padding: '0.25rem 0.65rem',
  fontSize: '12px',
  background: '#e2e8f0',
  cursor: 'pointer',
};

const violationCardStyle: CSSProperties = {
  borderRadius: '0.6rem',
  border: '1px solid rgba(15,23,42,0.08)',
  padding: '0.75rem',
  background: '#f8fafc',
  marginBottom: '0.75rem',
};

const selectorBoxStyle: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: '12px',
  background: '#0f172a',
  color: '#f8fafc',
  borderRadius: '0.45rem',
  padding: '0.4rem 0.55rem',
  marginTop: '0.4rem',
  wordBreak: 'break-all',
};

const overlayLinkStyle: CSSProperties = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const highlightNodes = (selectors: string[]) => {
  const highlighted: Array<{ element: HTMLElement; outline: string; offset: string }> = [];
  selectors.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((element) => {
        if (!(element instanceof HTMLElement)) {
          return;
        }
        highlighted.push({
          element,
          outline: element.style.outline,
          offset: element.style.outlineOffset,
        });
        element.style.outline = '3px solid #6366f1';
        element.style.outlineOffset = '2px';
      });
    } catch {
      // ignore invalid selectors
    }
  });
  return () => {
    highlighted.forEach(({ element, outline, offset }) => {
      element.style.outline = outline;
      element.style.outlineOffset = offset;
    });
  };
};

const A11yDevOverlay = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [violations, setViolations] = useState<AxeViolation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const hoverCleanupRef = useRef<null | (() => void)>(null);
  const isMountedRef = useRef(true);
  const axeRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (hoverCleanupRef.current) {
        hoverCleanupRef.current();
        hoverCleanupRef.current = null;
      }
    };
  }, []);

  const overlayEnabled = shouldEnableOverlay();

  const loadAxe = useCallback(async () => {
    if (axeRef.current) {
      return axeRef.current;
    }
    const axeModule = await import('axe-core');
    const axe = axeModule.default ?? axeModule;
    axe.configure({
      reporter: 'v2',
      rules: [
        {
          id: 'color-contrast',
          enabled: true,
        },
      ],
    });
    axeRef.current = axe;
    return axe;
  }, []);

  const runScan = useCallback(async () => {
    if (!overlayEnabled) {
      return;
    }
    setIsScanning(true);
    setError(null);
    try {
      const axe = await loadAxe();
      const results = await axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
        resultTypes: ['violations'],
      });

      if (!isMountedRef.current) {
        return;
      }

      setViolations(results.violations ?? []);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      if (!isMountedRef.current) {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to run axe-core.';
      setError(message);
    } finally {
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  }, [loadAxe, overlayEnabled]);

  useEffect(() => {
    if (!overlayEnabled) {
      return;
    }

    runScan().catch(() => {
      // errors handled inside runScan
    });

    const handleRoute = () => {
      runScan().catch(() => {
        // errors handled in runScan
      });
    };

    router.events?.on('routeChangeComplete', handleRoute);

    return () => {
      router.events?.off('routeChangeComplete', handleRoute);
    };
  }, [overlayEnabled, router.events, runScan]);

  useEffect(() => {
    if (hoverCleanupRef.current) {
      hoverCleanupRef.current();
      hoverCleanupRef.current = null;
    }
  }, [violations]);

  if (!overlayEnabled) {
    return null;
  }

  const sortedViolations = useMemo(() => {
    return [...violations].sort((a, b) => {
      const aImpact = severityOrder[formatImpact(a.impact)] ?? 99;
      const bImpact = severityOrder[formatImpact(b.impact)] ?? 99;
      if (aImpact !== bImpact) {
        return aImpact - bImpact;
      }
      return a.id.localeCompare(b.id);
    });
  }, [violations]);

  const totals = useMemo(() => {
    return sortedViolations.reduce<Record<string, number>>((acc, violation) => {
      const impact = formatImpact(violation.impact);
      acc[impact] = (acc[impact] ?? 0) + 1;
      return acc;
    }, {});
  }, [sortedViolations]);

  const totalViolations = sortedViolations.length;

  return (
    <div style={panelContainerStyle}>
      <button
        type="button"
        onClick={() =>
          setIsOpen((current) => {
            if (current && hoverCleanupRef.current) {
              hoverCleanupRef.current();
              hoverCleanupRef.current = null;
            }
            return !current;
          })
        }
        style={toggleButtonStyle}
        aria-expanded={isOpen}
      >
        <span style={{ fontWeight: 600 }}>A11y</span>
        <span
          style={{
            ...pillStyle,
            background: totalViolations > 0 ? '#dc2626' : '#16a34a',
          }}
        >
          {isScanning ? 'scanning…' : `${totalViolations} issues`}
        </span>
      </button>
      {isOpen ? (
        <div role="dialog" aria-label="Accessibility violations" style={panelStyle}>
          <div style={panelHeaderStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong>Accessibility scanner</strong>
              <button
                type="button"
                onClick={() => {
                  if (hoverCleanupRef.current) {
                    hoverCleanupRef.current();
                    hoverCleanupRef.current = null;
                  }
                  runScan().catch(() => {
                    // error handled inside runScan
                  });
                }}
                style={rescanButtonStyle}
                disabled={isScanning}
              >
                ⟳ {isScanning ? 'Scanning…' : 'Rescan'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span>Last updated: {formatTimestamp(lastUpdated)}</span>
              <div style={badgeListStyle}>
                {Object.entries(totals).map(([impact, count]) => (
                  <span
                    key={impact}
                    style={{
                      ...pillStyle,
                      background: severityColor[impact] ?? '#475569',
                    }}
                  >
                    {impact}: {count}
                  </span>
                ))}
                {totalViolations === 0 && (
                  <span
                    style={{
                      ...pillStyle,
                      background: '#16a34a',
                    }}
                  >
                    clean
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={panelBodyStyle}>
            {error ? (
              <p style={{ color: '#dc2626' }}>{error}</p>
            ) : totalViolations === 0 ? (
              <p>No accessibility violations were detected on this screen.</p>
            ) : (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {sortedViolations.map((violation) => (
                  <li key={violation.id} style={violationCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span
                        style={{
                          ...pillStyle,
                          background: severityColor[formatImpact(violation.impact)] ?? '#475569',
                        }}
                      >
                        {formatImpact(violation.impact)}
                      </span>
                      <a
                        href={violation.helpUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={overlayLinkStyle}
                      >
                        Guidance ↗
                      </a>
                    </div>
                    <p style={{ fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>{violation.help}</p>
                    <p style={{ margin: '0 0 0.35rem' }}>{violation.description}</p>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {violation.nodes.map((node, index) => (
                        <li
                          key={`${violation.id}-${index}`}
                          onMouseEnter={() => {
                            if (hoverCleanupRef.current) {
                              hoverCleanupRef.current();
                            }
                            hoverCleanupRef.current = highlightNodes(node.target ?? []);
                          }}
                          onMouseLeave={() => {
                            if (hoverCleanupRef.current) {
                              hoverCleanupRef.current();
                              hoverCleanupRef.current = null;
                            }
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>Selectors</div>
                          <div style={selectorBoxStyle}>{(node.target ?? []).join(', ') || 'No selector available'}</div>
                          {node.failureSummary && (
                            <p style={{ margin: '0.35rem 0 0' }}>{node.failureSummary}</p>
                          )}
                          {node.html && (
                            <pre
                              style={{
                                ...selectorBoxStyle,
                                marginTop: '0.35rem',
                                background: '#1e293b',
                              }}
                            >
                              {truncateHtml(node.html)}
                            </pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default A11yDevOverlay;
