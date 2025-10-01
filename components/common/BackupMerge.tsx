'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BucketDiff,
  MergeDecision,
  MergeDecisionMap,
  computeBucketDiffs,
} from '../../utils/backupMerge';

interface BackupMergeProps {
  localBuckets: Record<string, unknown>;
  incomingBuckets: Record<string, unknown>;
  onSubmit: (decisions: MergeDecisionMap) => void;
  onCancel?: () => void;
  initialDecisions?: MergeDecisionMap;
}

const decisionLabel: Record<MergeDecision, string> = {
  local: 'Keep local',
  incoming: 'Use backup',
};

const summarizeDiff = (diff: BucketDiff): string => {
  if (!diff.hasDifferences) return 'No differences detected.';

  if (diff.incomingOnly) {
    return 'New bucket found in backup.';
  }
  if (diff.localOnly) {
    return 'Bucket missing from backup; keeping local preserves it.';
  }

  const segments: string[] = [];
  if (diff.added.length > 0) {
    segments.push(`${diff.added.length} new ${diff.added.length === 1 ? 'key' : 'keys'}`);
  }
  if (diff.removed.length > 0) {
    segments.push(`${diff.removed.length} removed ${diff.removed.length === 1 ? 'key' : 'keys'}`);
  }
  if (diff.changed.length > 0) {
    const label = diff.type === 'array' ? 'entries' : 'keys';
    segments.push(`${diff.changed.length} changed ${diff.changed.length === 1 ? label.slice(0, -1) : label}`);
  }

  if (segments.length === 0) {
    return 'Bucket contents differ between backup and local state.';
  }

  return segments.join(', ') + '.';
};

const renderDetails = (diff: BucketDiff) => {
  if (!diff.hasDifferences) {
    return (
      <p className="text-xs text-gray-300">Buckets match exactly; nothing to resolve.</p>
    );
  }

  if (diff.type === 'primitive' && !diff.incomingOnly && !diff.localOnly) {
    return (
      <p className="text-xs text-gray-300">
        Value differs between backup and local data.
      </p>
    );
  }

  const renderList = (label: string, values: string[], tone: string) => (
    <div>
      <p className="text-xs font-semibold text-gray-200">{label}</p>
      <ul className="mt-1 space-y-1 text-xs">
        {values.map((key) => (
          <li key={`${label}-${key}`} className={tone}>
            {key}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs text-gray-300">
      {diff.added.length > 0 && renderList('Added', diff.added, 'text-green-300')}
      {diff.removed.length > 0 && renderList('Removed', diff.removed, 'text-red-300')}
      {diff.changed.length > 0 && renderList('Changed', diff.changed, 'text-yellow-200')}
      {diff.incomingOnly && (
        <p className="text-green-300">Entire bucket will be created from backup.</p>
      )}
      {diff.localOnly && (
        <p className="text-red-300">
          Backup lacks this bucket; keeping local preserves existing data.
        </p>
      )}
    </div>
  );
};

const BackupMerge = ({
  localBuckets,
  incomingBuckets,
  onSubmit,
  onCancel,
  initialDecisions = {},
}: BackupMergeProps) => {
  const diffs = useMemo(
    () => computeBucketDiffs(localBuckets, incomingBuckets),
    [localBuckets, incomingBuckets],
  );

  const defaultDecisions = useMemo(() => {
    const map: MergeDecisionMap = {};
    for (const diff of diffs) {
      if (initialDecisions[diff.bucket]) {
        map[diff.bucket] = initialDecisions[diff.bucket];
        continue;
      }
      if (diff.incomingOnly && !diff.localOnly) {
        map[diff.bucket] = 'incoming';
      } else {
        map[diff.bucket] = 'local';
      }
    }
    return map;
  }, [diffs, initialDecisions]);

  const [decisions, setDecisions] = useState<MergeDecisionMap>(defaultDecisions);

  useEffect(() => {
    setDecisions(defaultDecisions);
  }, [defaultDecisions]);

  const hasDifferences = diffs.some((diff) => diff.hasDifferences);

  const handleDecision = (bucket: string, decision: MergeDecision) => {
    setDecisions((prev) => ({ ...prev, [bucket]: decision }));
  };

  const handleSubmit = () => {
    onSubmit(decisions);
  };

  return (
    <div className="rounded-md border border-gray-700 bg-gray-900 p-4 text-white">
      <h3 className="text-lg font-semibold">Resolve backup conflicts</h3>
      {diffs.length === 0 ? (
        <p className="mt-2 text-sm text-gray-300">
          No data buckets found in the backup.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {diffs.map((diff) => (
            <li key={diff.bucket} className="rounded border border-gray-800 bg-gray-950 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-gray-200">
                    {diff.bucket}
                  </p>
                  <p className="mt-1 text-xs text-gray-300">{summarizeDiff(diff)}</p>
                </div>
                <div className="flex items-center gap-2 self-start">
                  {(Object.keys(decisionLabel) as MergeDecision[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleDecision(diff.bucket, value)}
                      className={`rounded border px-3 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${decisions[diff.bucket] === value ? 'border-blue-400 bg-blue-500/20 text-blue-100' : 'border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700/70'}`}
                      aria-pressed={decisions[diff.bucket] === value}
                    >
                      {decisionLabel[value]}
                    </button>
                  ))}
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-blue-300">
                  View details
                </summary>
                <div className="mt-2">{renderDetails(diff)}</div>
              </details>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasDifferences}
          className={`rounded px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasDifferences ? 'bg-blue-600 text-white hover:bg-blue-500' : 'cursor-not-allowed bg-gray-700 text-gray-400'}`}
        >
          Apply decisions
        </button>
      </div>
    </div>
  );
};

export default BackupMerge;

