import React from 'react';
import { CopyProgress, formatBytes, formatEta } from '../../../utils/fileCopy';

interface CopyStatusBarProps {
  jobName: string;
  progress: CopyProgress;
  onCancel: () => void;
}

const CopyStatusBar: React.FC<CopyStatusBarProps> = ({
  jobName,
  progress,
  onCancel,
}) => {
  const { bytesProcessed, totalBytes, throughput, etaMs } = progress;
  const percent = totalBytes
    ? Math.min(100, (bytesProcessed / totalBytes) * 100)
    : 0;

  return (
    <div
      className="w-full shrink-0 bg-black bg-opacity-60 px-3 py-2 text-xs text-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold" aria-label="Copy job">
              {jobName}
            </span>
            <span aria-label="Copy percent complete">{percent.toFixed(1)}%</span>
          </div>
          <div className="h-1 mt-1 rounded bg-gray-700" aria-hidden="true">
            <div
              className="h-full rounded bg-blue-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-gray-200">
            <span>
              {formatBytes(bytesProcessed)} / {formatBytes(totalBytes)}
            </span>
            <span>{formatBytes(throughput)}/s</span>
            <span>ETA: {formatEta(etaMs)}</span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default CopyStatusBar;

