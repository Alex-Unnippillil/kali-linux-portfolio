import React, { useMemo, useState } from 'react';
import Toast from '../../ui/Toast';
import {
  USBDeviceNode,
  USBDeviceState,
  createUsbSnapshot,
} from '../../../utils/usbMock';

const layoutDocUrl =
  'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/internal-layouts.md#usb-safety-checks';
const taskDocUrl =
  'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/tasks.md#usb-problem-triage';

type ToastState = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

interface ReleaseSummary {
  name: string;
  closed: number;
  remaining: number;
  initial: number;
}

interface ReleaseResult {
  nodes: USBDeviceNode[];
  changed: boolean;
  summary?: ReleaseSummary;
}

const collectIds = (nodes: USBDeviceNode[]): string[] =>
  nodes.flatMap((node) => [node.id, ...(node.children ? collectIds(node.children) : [])]);

const stateLabels: Record<USBDeviceState, string> = {
  active: 'Active',
  idle: 'Idle',
  busy: 'Busy',
  problem: 'Problem',
  ejected: 'Safe to remove',
};

const stateStyles: Record<USBDeviceState, string> = {
  active: 'bg-blue-900 text-blue-200 border border-blue-600',
  idle: 'bg-slate-800 text-slate-200 border border-slate-600',
  busy: 'bg-amber-900 text-amber-100 border border-amber-600',
  problem: 'bg-red-900 text-red-100 border border-red-600',
  ejected: 'bg-emerald-900 text-emerald-100 border border-emerald-600',
};

const releaseDevice = (
  nodes: USBDeviceNode[],
  targetId: string,
): ReleaseResult => {
  let changed = false;
  let summary: ReleaseSummary | undefined;

  const updated = nodes.map((node) => {
    if (node.id === targetId) {
      const handles = node.handles ?? [];
      const closable = handles.filter((handle) => handle.canRelease);
      const stuck = handles.filter((handle) => !handle.canRelease);
      const nextState: USBDeviceState =
        node.state === 'problem'
          ? node.state
          : stuck.length === 0
          ? 'ejected'
          : 'busy';

      summary = {
        name: node.name,
        closed: closable.length,
        remaining: stuck.length,
        initial: handles.length,
      };

      changed = true;

      return {
        ...node,
        state: nextState,
        handles: nextState === 'ejected' ? [] : stuck,
      };
    }

    if (node.children) {
      const childResult = releaseDevice(node.children, targetId);
      if (childResult.changed) {
        changed = true;
      }
      if (!summary && childResult.summary) {
        summary = childResult.summary;
      }
      return childResult.changed
        ? { ...node, children: childResult.nodes }
        : node;
    }

    return node;
  });

  return {
    nodes: changed ? updated : nodes,
    changed,
    summary,
  };
};

const openExternal = (url: string) => {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const PeripheralsApp: React.FC = () => {
  const initialTree = useMemo(() => createUsbSnapshot(), []);
  const [tree, setTree] = useState<USBDeviceNode[]>(initialTree);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(collectIds(initialTree)),
  );
  const [toast, setToast] = useState<ToastState | null>(null);

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleEject = (id: string) => {
    let summary: ReleaseSummary | undefined;
    setTree((prev) => {
      const result = releaseDevice(prev, id);
      summary = result.summary;
      return result.changed ? result.nodes : prev;
    });

    if (summary) {
      if (summary.remaining > 0) {
        const message = summary.closed
          ? `Closed ${summary.closed} handle${summary.closed === 1 ? '' : 's'} on ${summary.name}, but ${summary.remaining} still busy.`
          : `${summary.name} is still busy (${summary.remaining} handle${summary.remaining === 1 ? '' : 's'}).`;
        setToast({
          message,
          actionLabel: 'Troubleshoot',
          onAction: () => openExternal(layoutDocUrl),
        });
      } else if (summary.initial > 0 || summary.closed > 0) {
        setToast({ message: `Safely ejected ${summary.name}.` });
      } else {
        setToast({ message: `${summary.name} is already safe to remove.` });
      }
    }
  };

  const renderHandles = (handles: USBDeviceNode['handles']) => {
    const list = handles ?? [];
    if (!list.length) {
      return <p className="mt-2 text-xs text-gray-500">No open handles.</p>;
    }

    return (
      <ul
        role="list"
        className="mt-2 space-y-1 border-l border-gray-800 pl-4 text-xs text-gray-300"
      >
        {list.map((handle) => (
          <li
            key={`${handle.pid}-${handle.process}`}
            className="flex flex-col gap-1 rounded bg-gray-900/60 p-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-mono text-[11px] text-gray-200">
              {handle.process} (PID {handle.pid})
            </span>
            <span className="text-[11px] text-gray-400">{handle.description}</span>
            <span
              className={`w-max rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                handle.canRelease
                  ? 'bg-emerald-900 text-emerald-100'
                  : 'bg-red-900 text-red-100'
              }`}
            >
              {handle.canRelease ? 'Auto-release ready' : 'Manual close required'}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const renderNode = (node: USBDeviceNode, depth = 1): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = Boolean(node.children?.length);
    const canEject =
      node.state !== 'active' && node.state !== 'problem' && node.state !== 'ejected';
    const disableReason =
      node.state === 'problem'
        ? 'Resolve device problem before ejecting.'
        : node.state === 'active'
        ? 'Root hubs stay powered while downstream ports are scanned.'
        : undefined;

    return (
      <li
        key={node.id}
        role="treeitem"
        aria-level={depth}
        aria-expanded={hasChildren ? isExpanded : undefined}
        data-testid={`device-${node.id}`}
        className="border-l border-gray-800 pl-4"
      >
        <div className="flex flex-col gap-2 py-3">
          <div className="flex items-start gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.id)}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.name}`}
                className="mt-1 rounded border border-gray-700 bg-gray-900 px-2 text-sm text-gray-200"
              >
                {isExpanded ? '−' : '+'}
              </button>
            ) : (
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center text-gray-600">
                •
              </span>
            )}
            <div className="flex-1 space-y-1">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-white">{node.name}</h3>
                <span
                  className={`inline-flex w-max items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${stateStyles[node.state]}`}
                >
                  {stateLabels[node.state]}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-xs text-gray-300 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <span className="font-mono">VID {node.vendorId} / PID {node.productId}</span>
                <span>Driver: {node.driver}</span>
                <span>
                  Location: {node.location}
                  {node.speed ? ` • ${node.speed}` : ''}
                </span>
              </div>
              {node.notes && (
                <p className="text-xs text-gray-400">{node.notes}</p>
              )}
              {node.problem && (
                <div className="text-xs text-red-300">
                  <p>{node.problem}</p>
                  <a
                    href={taskDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center text-red-200 underline"
                  >
                    Problem triage tips
                  </a>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleEject(node.id)}
                  disabled={!canEject}
                  title={disableReason}
                  className={`rounded px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    canEject
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'cursor-not-allowed bg-gray-700 text-gray-400'
                  }`}
                  aria-label={`Safe eject ${node.name}`}
                >
                  Safe eject
                </button>
                <button
                  type="button"
                  onClick={() => openExternal(layoutDocUrl)}
                  className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-200 transition hover:border-blue-500 hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Layout guide
                </button>
              </div>
              {renderHandles(node.handles)}
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <ul role="group" className="pl-4">
            {node.children?.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-[#0b0e14] text-gray-100">
      <header className="border-b border-gray-800 px-4 py-3">
        <h1 className="text-lg font-semibold text-white">USB Peripherals</h1>
        <p className="mt-1 text-xs text-gray-400">
          Review connected devices, release busy handles, and prepare hardware for safe removal.
        </p>
      </header>
      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="mb-3 rounded border border-blue-900 bg-blue-950/60 p-3 text-xs text-blue-200">
          Busy handles will be closed automatically when possible. Use the layout guide for manual remediation steps.
        </div>
        <ul role="tree" aria-label="USB device tree" className="space-y-1">
          {tree.map((node) => renderNode(node))}
        </ul>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default PeripheralsApp;
export const displayPeripherals = () => <PeripheralsApp />;
