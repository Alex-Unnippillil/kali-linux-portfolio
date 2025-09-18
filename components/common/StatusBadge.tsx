import React from 'react';
import { STATUS_TONE_METADATA, StatusTone, resolveTone } from './statusMeta';

type StatusBadgeProps = {
  status: string;
  tone?: StatusTone;
  icon?: React.ReactNode;
  className?: string;
  srLabel?: string;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  tone,
  icon,
  className = '',
  srLabel,
}) => {
  const resolvedTone = tone ?? resolveTone(status);
  const metadata = STATUS_TONE_METADATA[resolvedTone];
  const label = status.trim();
  return (
    <span
      className={`status-badge ${className}`.trim()}
      data-tone={resolvedTone}
      aria-label={srLabel}
    >
      <span className="status-badge__icon" aria-hidden="true">
        {icon ?? metadata.icon}
      </span>
      <span className="status-badge__text">{label}</span>
    </span>
  );
};

export default StatusBadge;
