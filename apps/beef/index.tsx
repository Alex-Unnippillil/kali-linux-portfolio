'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import BeefApp from '../../components/apps/beef';
import QueueLogModal from './components/QueueLogModal';
import {
  queueActions,
  useQueueStore,
  type QueueItem,
  type QueueStatus,
} from './state/queueStore';

const statusStyles: Record<QueueStatus, string> = {
  queued: 'bg-slate-600 text-white',
  running: 'bg-blue-700 text-white',
  success: 'bg-green-700 text-white',
  failed: 'bg-red-700 text-white',
};

const statusLabels: Record<QueueStatus, string> = {
  queued: 'Queued',
  running: 'Running',
  success: 'Completed',
  failed: 'Failed',
};

const BeefPage: React.FC = () => {
  const queueItems = useQueueStore((state) => state.items);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (seededRef.current || queueItems.length > 0) {
      return;
    }
    seededRef.current = true;

    const stageHook = queueActions.enqueueCommand('Stage harmless hook', { maxRetries: 3 });
    queueActions.markCommandRunning(stageHook.id);
    queueActions.markCommandFailure(
      stageHook.id,
      'Initial hook blocked by sandboxed iframe.',
    );
    queueActions.retryCommand(stageHook.id);
    queueActions.markCommandRunning(stageHook.id);
    queueActions.markCommandFailure(
      stageHook.id,
      'Content Security Policy prevented inline script execution.',
    );

    const deliverPayload = queueActions.enqueueCommand('Deliver demo payload');
    queueActions.markCommandRunning(deliverPayload.id);
    queueActions.markCommandSuccess(deliverPayload.id);

    const domSnapshot = queueActions.enqueueCommand('Collect DOM snapshot', { maxRetries: 2 });
    queueActions.markCommandRunning(domSnapshot.id);

    queueActions.enqueueCommand('Await callbacks from demo clients');

    const privilegeAttempt = queueActions.enqueueCommand(
      'Escalate privileges (simulated)',
      { maxRetries: 1 },
    );
    queueActions.markCommandRunning(privilegeAttempt.id);
    queueActions.markCommandFailure(
      privilegeAttempt.id,
      'Privilege escalation blocked by lab guard rails.',
    );
  }, [queueItems.length]);

  const handleRetry = (item: QueueItem) => {
    const retried = queueActions.retryCommand(item.id);
    if (retried) {
      queueActions.markCommandRunning(item.id);
    }
  };

  return (
    <div className="bg-ub-cool-grey text-white h-full w-full flex flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Image
            src="/themes/Yaru/apps/beef.svg"
            alt="BeEF badge"
            width={48}
            height={48}
          />
          <h1 className="text-xl">BeEF Demo</h1>
        </div>
        <div className="flex gap-2">
          <img
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="minimize"
            className="w-6 h-6"
          />
          <img
            src="/themes/Yaru/window/window-close-symbolic.svg"
            alt="close"
            className="w-6 h-6"
          />
        </div>
      </header>

      <div className="p-4 flex-1 overflow-auto">
        <BeefApp />
      </div>

      <section className="border-t border-gray-700 bg-black/20">
        <div className="px-4 py-3">
          <h2 className="text-lg font-semibold">Command queue</h2>
          <p className="text-xs text-gray-300">
            Commands execute locally in this demo. Failures simply document simulated guard rails.
          </p>
        </div>
        <div className="divide-y divide-gray-800">
          {queueItems.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-300">No commands queued.</p>
          )}
          {queueItems.map((item) => {
            const attemptsRemaining = item.maxRetries - item.retries;
            const canRetry = item.status === 'failed' && attemptsRemaining > 0;
            const showLog = item.failures.length > 0;
            const statusLabel =
              item.status === 'failed' && item.retries >= item.maxRetries
                ? 'Failed (limit reached)'
                : statusLabels[item.status];
            return (
              <div
                key={item.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-[16rem] flex-1">
                  <p className="font-mono text-sm leading-5">{item.command}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Attempts used {item.retries} / {item.maxRetries}
                    {item.lastError ? ` · Last error: ${item.lastError}` : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                >
                  {statusLabel}
                </span>
                {showLog && (
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="rounded border border-gray-600 px-2 py-1 text-xs transition hover:bg-gray-700"
                  >
                    View log
                  </button>
                )}
                {canRetry && (
                  <button
                    type="button"
                    onClick={() => handleRetry(item)}
                    className="rounded bg-ub-primary px-3 py-1 text-xs font-semibold text-white transition hover:bg-ub-primary-dark"
                  >
                    Retry ({attemptsRemaining} left)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {selectedItem && (
        <QueueLogModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
};

export default BeefPage;
