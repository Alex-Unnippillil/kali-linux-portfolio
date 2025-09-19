import React from 'react';
import { useThrottledValue } from './useThrottledValue';

type TaskbarBadgeProps = {
    appId?: string;
    count?: number | null;
    max?: number;
    srLabel?: string;
    className?: string;
};

const clampCount = (value: number, max: number) => {
    const limit = Math.max(1, Math.floor(max));
    if (value > limit) {
        return `${limit}+`;
    }
    return `${value}`;
};

export const TaskbarBadge: React.FC<TaskbarBadgeProps> = ({
    appId,
    count = 0,
    max = 99,
    srLabel,
    className,
}) => {
    const numericCount = typeof count === 'number' && Number.isFinite(count) ? count : 0;
    const throttledCount = useThrottledValue<number>(Math.max(0, Math.round(numericCount)), 10);

    if (throttledCount <= 0) {
        return null;
    }

    const displayValue = clampCount(throttledCount, max);
    const label = srLabel || `${displayValue} updates pending`;

    return (
        <span
            className={`taskbar-badge ${className ?? ''}`.trim()}
            data-count={displayValue}
            data-app-id={appId}
            role="status"
            aria-live="polite"
            aria-label={label}
            title={label}
        >
            <span aria-hidden="true">{displayValue}</span>
        </span>
    );
};

export default TaskbarBadge;
