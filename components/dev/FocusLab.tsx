'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../base/Modal';
import WhiskerMenu from '../menu/WhiskerMenu';
import {
  FocusTrapCheckResult,
  runFocusTrapCheck,
} from '../../utils/focusTrap';

type RunState = 'idle' | 'running';

const MODAL_TRAP_ID = 'focus-lab-modal';
const MENU_TRAP_ID = 'focus-lab-menu';

const formatTimestamp = (timestamp: number) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(timestamp);
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
};

const FocusLab = () => {
  const overlayRootRef = useRef<HTMLDivElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scenarioReady, setScenarioReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reports, setReports] = useState<FocusTrapCheckResult[]>([]);
  const [lastRun, setLastRun] = useState<number | null>(null);
  const [runState, setRunState] = useState<RunState>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.createElement('div');
    root.setAttribute('data-focus-lab-overlay-root', '');
    Object.assign(root.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      pointerEvents: 'none',
      opacity: '0',
    });
    document.body.appendChild(root);
    overlayRootRef.current = root;
    setModalOpen(true);
    const frame = window.requestAnimationFrame(() => {
      setScenarioReady(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      overlayRootRef.current = null;
      document.body.removeChild(root);
    };
  }, []);

  const runChecks = useCallback(() => {
    if (!scenarioReady) return;
    setRunState('running');
    const execute = () => {
      const modalTrap = document.querySelector<HTMLElement>(
        `[data-focus-lab-case="${MODAL_TRAP_ID}"]`,
      );
      const menuTrap = document.querySelector<HTMLElement>(
        `[data-focus-lab-case="${MENU_TRAP_ID}"]`,
      );
      const nextReports: FocusTrapCheckResult[] = [
        runFocusTrapCheck(modalTrap, {
          id: 'base-modal',
          label: 'Base modal focus trap',
        }),
        runFocusTrapCheck(menuTrap, {
          id: 'whisker-menu',
          label: 'Whisker menu focus trap',
        }),
      ];
      setReports(nextReports);
      setLastRun(Date.now());
      setRunState('idle');
    };
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(execute);
    } else {
      execute();
    }
  }, [scenarioReady]);

  useEffect(() => {
    if (!scenarioReady) return;
    const timer = window.setTimeout(() => {
      runChecks();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [runChecks, scenarioReady]);

  const overallStatus = useMemo(() => {
    if (reports.length === 0) return 'pending';
    return reports.every((report) => report.status === 'pass') ? 'pass' : 'fail';
  }, [reports]);

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '-10000px',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {overlayRootRef.current && modalOpen && (
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            overlayRoot={overlayRootRef.current}
            focusTrapId={MODAL_TRAP_ID}
          >
            <div
              style={{
                position: 'fixed',
                top: '-10000px',
                left: '-10000px',
                width: '1px',
                height: '1px',
                overflow: 'hidden',
              }}
            >
              <button type="button">Primary action</button>
              <button type="button">Secondary action</button>
              <a href="#focus-lab-dismiss">Dismiss</a>
            </div>
          </Modal>
        )}
        <div>
          <WhiskerMenu forceOpen debugFocusId={MENU_TRAP_ID} />
        </div>
      </div>

      <div className="pointer-events-none fixed bottom-4 right-4 z-[1200] text-xs">
        <div className="pointer-events-auto w-72 rounded-lg border border-white/15 bg-slate-950/90 text-white shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-t-lg px-3 py-2 text-left text-[11px] uppercase tracking-[0.2em]"
          >
            <span className="font-semibold">Focus Lab</span>
            <span
              className={
                overallStatus === 'pass'
                  ? 'text-emerald-400'
                  : overallStatus === 'fail'
                  ? 'text-rose-400'
                  : 'text-yellow-300'
              }
            >
              {overallStatus === 'pass'
                ? 'Pass'
                : overallStatus === 'fail'
                ? 'Fail'
                : 'Pending'}
            </span>
          </button>
          {expanded && (
            <div className="border-t border-white/10 p-3">
              <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-white/70">
                <span>
                  {lastRun ? `Last run ${formatTimestamp(lastRun)}` : 'Diagnostics pending'}
                </span>
                <button
                  type="button"
                  onClick={runChecks}
                  className="rounded bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
                  disabled={runState === 'running'}
                >
                  {runState === 'running' ? 'Running…' : 'Run again'}
                </button>
              </div>
              <ul className="space-y-2 text-[12px]">
                {reports.map((report) => (
                  <li
                    key={report.id}
                    className="rounded border border-white/10 bg-white/5 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{report.label}</span>
                      <span
                        className={
                          report.status === 'pass'
                            ? 'text-emerald-300'
                            : 'text-rose-300'
                        }
                      >
                        {report.status === 'pass' ? 'Pass' : 'Fail'}
                      </span>
                    </div>
                    {report.details.length > 0 && (
                      <ul className="mt-1 space-y-1 text-[11px] text-white/70">
                        {report.details.map((detail, index) => (
                          <li key={`${report.id}-detail-${index}`}>• {detail}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
                {reports.length === 0 && (
                  <li className="rounded border border-dashed border-white/20 bg-white/5 p-2 text-[11px] text-white/70">
                    Diagnostics will populate after the first run.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FocusLab;
