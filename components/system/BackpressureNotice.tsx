import React from 'react';
import clsx from 'clsx';
import useBackpressureJob from '../../hooks/useBackpressureJob';
import { cancelJob, resumeJob } from '../../utils/backpressure';

interface BackpressureNoticeProps {
  jobId?: string | null;
  className?: string;
  description?: string;
}

const BackpressureNotice: React.FC<BackpressureNoticeProps> = ({
  jobId,
  className,
  description,
}) => {
  const job = useBackpressureJob(jobId);

  if (!job) return null;

  const isWaiting = job.status === 'queued';
  const isPaused = job.status === 'paused';

  if (!isWaiting && !isPaused) return null;

  const label = description || job.label || job.type;
  const queueMessage = isWaiting
    ? `Waiting for available worker capacity. ${
        job.position ? `Position ${job.position} of ${job.queued}.` : ''
      }`
    : 'Job is paused. Resume to continue processing.';

  const cancel = () => {
    if (jobId) cancelJob(jobId);
  };

  const resume = () => {
    if (jobId) resumeJob(jobId);
  };

  return (
    <div
      className={clsx(
        'rounded border border-ub-orange/60 bg-black/70 p-3 text-xs text-white shadow-lg',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold text-sm" data-testid="backpressure-title">
        {label}
      </p>
      <p className="mt-1 leading-relaxed" data-testid="backpressure-message">
        {queueMessage}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="rounded bg-ub-red px-3 py-1 text-xs font-medium text-white"
          onClick={cancel}
        >
          {isPaused ? 'Remove' : 'Cancel'}
        </button>
        {isPaused && job.allowResume && (
          <button
            type="button"
            className="rounded bg-ub-green px-3 py-1 text-xs font-medium text-black"
            onClick={resume}
          >
            Resume
          </button>
        )}
      </div>
    </div>
  );
};

export default BackpressureNotice;
