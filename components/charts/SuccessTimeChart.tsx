import React, { useMemo } from 'react';

interface SuccessTimeChartProps {
  successRate: number;
  averageDuration: number;
  maxDuration?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const formatSeconds = (ms: number) => {
  const seconds = ms / 1000;
  if (seconds >= 10) return seconds.toFixed(0);
  if (seconds >= 1) return seconds.toFixed(1);
  return seconds.toFixed(2);
};

const SuccessTimeChart: React.FC<SuccessTimeChartProps> = ({
  successRate,
  averageDuration,
  maxDuration = 10000,
}) => {
  const { percent, dashOffset, durationRatio, secondsLabel } = useMemo(() => {
    const clampedRate = clamp(Number.isFinite(successRate) ? successRate : 0, 0, 1);
    const percentValue = Math.round(clampedRate * 100);
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const dash = circumference * (1 - clampedRate);
    const safeDuration = Math.max(0, Number.isFinite(averageDuration) ? averageDuration : 0);
    const ratio = clamp(maxDuration > 0 ? safeDuration / maxDuration : 0, 0, 1);
    return {
      percent: percentValue,
      dashOffset: dash,
      durationRatio: ratio,
      secondsLabel: formatSeconds(safeDuration),
    };
  }, [successRate, averageDuration, maxDuration]);

  const chartLabel = `Success rate ${percent}% with average duration ${secondsLabel} seconds.`;

  return (
    <div
      role="img"
      aria-label={chartLabel}
      className="flex items-center gap-6"
    >
      <svg
        width={100}
        height={100}
        viewBox="0 0 100 100"
        className="text-ub-green"
      >
        <circle
          cx={50}
          cy={50}
          r={32}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={8}
          fill="none"
        />
        <circle
          cx={50}
          cy={50}
          r={32}
          stroke="currentColor"
          strokeWidth={8}
          fill="none"
          strokeDasharray={2 * Math.PI * 32}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="18"
          fontWeight="600"
        >
          {percent}%
        </text>
      </svg>
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-gray-300">
          Average time
        </div>
        <div className="text-xl font-semibold text-white">{secondsLabel}s</div>
        <div className="mt-2 h-2 rounded bg-ub-dark-grey overflow-hidden">
          <div
            className="h-2 bg-ub-green"
            style={{ width: `${durationRatio * 100}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-400">
          Window scaled to {formatSeconds(maxDuration)}s
        </div>
      </div>
    </div>
  );
};

export default SuccessTimeChart;
