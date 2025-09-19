import React, { useMemo } from 'react';
import { useThrottledValue } from './useThrottledValue';

type TaskbarProgressState = 'normal' | 'paused' | 'error' | 'complete';

type TaskbarProgressRingProps = {
    appId: string;
    value: number;
    status?: TaskbarProgressState;
    srLabel?: string;
    className?: string;
};

const clamp = (val: number) => Math.min(100, Math.max(0, val));
const RADIUS = 14;
const STROKE_WIDTH = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const TaskbarProgressRing: React.FC<TaskbarProgressRingProps> = ({
    appId,
    value,
    status = 'normal',
    srLabel,
    className,
}) => {
    const normalizedInput = useMemo(() => {
        if (!Number.isFinite(value)) {
            return 0;
        }
        let numeric = Number(value);
        if (numeric <= 1) {
            numeric *= 100;
        }
        return clamp(numeric);
    }, [value]);

    const throttledValue = useThrottledValue<number>(normalizedInput, 10);
    const clampedValue = clamp(throttledValue);
    const offset = CIRCUMFERENCE * (1 - clampedValue / 100);
    const label = srLabel || `${Math.round(clampedValue)}% complete`;

    return (
        <div
            className={`taskbar-progress-ring ${className ?? ''}`.trim()}
            data-app-id={appId}
            data-progress={clampedValue.toFixed(2)}
            data-state={status}
            role="img"
            aria-label={label}
        >
            <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
                <circle
                    className="taskbar-progress-track"
                    cx="16"
                    cy="16"
                    r={RADIUS}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                />
                <circle
                    className="taskbar-progress-indicator"
                    cx="16"
                    cy="16"
                    r={RADIUS}
                    strokeWidth={STROKE_WIDTH}
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 16 16)"
                />
            </svg>
            <span className="sr-only" aria-live="polite">
                {label}
            </span>
        </div>
    );
};

export default TaskbarProgressRing;
