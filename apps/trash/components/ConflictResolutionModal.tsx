'use client';

import { useMemo, useState } from 'react';
import Modal from '../../../components/base/Modal';
import {
  ConflictAction,
  ConflictResolutionRequest,
} from '../state';

interface Props {
  isOpen: boolean;
  request: ConflictResolutionRequest | null;
  onDecision: (action: ConflictAction, applyToAll: boolean) => void;
}

const ACTION_LABELS: Record<ConflictAction, string> = {
  replace: 'Replace existing',
  skip: 'Skip this item',
  'keep-both': 'Keep both (auto-rename)',
};

const ActionDescription: Record<ConflictAction, string> = {
  replace: 'Overwrite the existing window snapshot with the version from history.',
  skip: 'Leave the existing window untouched and keep this item in history.',
  'keep-both': 'Restore with a unique name so both copies stay available.',
};

const formatDateTime = (value: number) =>
  new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function ConflictResolutionModal({
  isOpen,
  request,
  onDecision,
}: Props) {
  const [applyToAll, setApplyToAll] = useState<Record<ConflictAction, boolean>>({
    replace: false,
    skip: false,
    'keep-both': false,
  });

  const diffAvailable = useMemo(() => {
    if (!request) return false;
    return Boolean(request.existing.image || request.restored.image);
  }, [request]);

  const handleDecision = (action: ConflictAction) => {
    onDecision(action, applyToAll[action]);
    setApplyToAll({ replace: false, skip: false, 'keep-both': false });
  };

  const handleClose = () => {
    if (!request) return;
    onDecision('skip', false);
    setApplyToAll({ replace: false, skip: false, 'keep-both': false });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 p-4">
        <div className="w-full max-w-3xl rounded-lg bg-ub-cool-grey text-white shadow-xl border border-ub-warm-grey">
          <div className="border-b border-ub-warm-grey px-5 py-3">
            <h2 className="text-lg font-bold">Name conflict detected</h2>
            {request && (
              <p className="mt-1 text-sm text-ubt-grey">
                &ldquo;{request.restored.title}&rdquo; already exists in Trash. Choose how you would like to proceed.
              </p>
            )}
          </div>
          {request && (
            <div className="px-5 py-4 space-y-4">
              <div className="rounded bg-black bg-opacity-40 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-ub-orange">
                  Conflict preview
                </h3>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="rounded border border-ub-warm-grey bg-black bg-opacity-30 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-ubt-grey">
                      Existing
                    </div>
                    {request.existing.image ? (
                      <img
                        src={request.existing.image}
                        alt="Existing window preview"
                        className="mt-2 h-32 w-full rounded object-contain bg-black bg-opacity-40"
                      />
                    ) : (
                      <div className="mt-2 h-32 w-full rounded bg-black bg-opacity-40 flex items-center justify-center text-xs text-ubt-grey">
                        No preview available
                      </div>
                    )}
                    <dl className="mt-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-ubt-grey">Title</dt>
                        <dd className="font-mono">{request.existing.title}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ubt-grey">Closed</dt>
                        <dd>{formatDateTime(request.existing.closedAt)}</dd>
                      </div>
                    </dl>
                  </div>
                  <div className="rounded border border-ub-warm-grey bg-black bg-opacity-30 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-ubt-grey">
                      Restoring from history
                    </div>
                    {request.restored.image ? (
                      <img
                        src={request.restored.image}
                        alt="Restored window preview"
                        className="mt-2 h-32 w-full rounded object-contain bg-black bg-opacity-40"
                      />
                    ) : (
                      <div className="mt-2 h-32 w-full rounded bg-black bg-opacity-40 flex items-center justify-center text-xs text-ubt-grey">
                        No preview available
                      </div>
                    )}
                    <dl className="mt-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-ubt-grey">Title</dt>
                        <dd className="font-mono">{request.restored.title}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-ubt-grey">Captured</dt>
                        <dd>{formatDateTime(request.restored.closedAt)}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 rounded bg-black bg-opacity-40 px-2 py-1 text-xs">
                      Suggested new name: <span className="font-mono">{request.suggestedName}</span>
                    </div>
                  </div>
                </div>
                {!diffAvailable && (
                  <p className="mt-3 text-xs text-ubt-grey">
                    A visual preview is not available for one of the entries. You can still choose an action below.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {(Object.keys(ACTION_LABELS) as ConflictAction[]).map(action => {
                  const checkboxId = `apply-${action}`;
                  return (
                    <div
                      key={action}
                      className="flex flex-col gap-2 rounded border border-ub-warm-grey bg-black bg-opacity-30 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-semibold">{ACTION_LABELS[action]}</p>
                        <p className="text-xs text-ubt-grey">{ActionDescription[action]}</p>
                        {action === 'keep-both' && (
                          <p className="mt-1 text-xs text-ub-orange">
                            Restored entry will be renamed to <span className="font-mono">{request.suggestedName}</span>.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <label htmlFor={checkboxId} className="flex items-center gap-2 text-xs">
                          <input
                            id={checkboxId}
                            type="checkbox"
                            className="h-4 w-4"
                            checked={applyToAll[action]}
                            aria-label={`Apply ${ACTION_LABELS[action]} to all conflicts`}
                            onChange={e =>
                              setApplyToAll(prev => ({ ...prev, [action]: e.target.checked }))
                            }
                          />
                          Apply to all
                        </label>
                        <button
                          className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                          onClick={() => handleDecision(action)}
                        >
                          {ACTION_LABELS[action].split('(')[0].trim()}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
