import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import handshakeSample from '../../../data/handshake.json';

type HandshakeStep = {
  step: string;
  from: string;
  to: string;
  description: string;
};

type HandshakeDataset = {
  title: string;
  participants?: string[];
  steps: HandshakeStep[];
};

type ParticipantLayout = {
  name: string;
  x: number;
};

type StepLayout = HandshakeStep & {
  index: number;
  fromX: number;
  toX: number;
  y: number;
  labelX: number;
  labelY: number;
};

type DiagramLayout = {
  width: number;
  height: number;
  lineTop: number;
  lineBottom: number;
  labelWidth: number;
  labelHeight: number;
  participants: ParticipantLayout[];
  steps: StepLayout[];
};

const HANDSHAKE_DATA = handshakeSample as HandshakeDataset;
const DEFAULT_PARTICIPANTS = Array.from(
  new Set(
    HANDSHAKE_DATA.steps.flatMap((s) => [s.from, s.to])
  )
);

const PARTICIPANTS =
  HANDSHAKE_DATA.participants && HANDSHAKE_DATA.participants.length > 0
    ? HANDSHAKE_DATA.participants
    : DEFAULT_PARTICIPANTS;

const HORIZONTAL_PADDING = 80;
const LANE_GAP = 220;
const STEP_GAP = 110;
const STEP_VERTICAL_OFFSET = 80;
const LINE_BOTTOM_PADDING = 60;
const LABEL_WIDTH = 200;
const LABEL_HEIGHT = 46;

const computeLayout = (
  participants: readonly string[],
  steps: readonly HandshakeStep[]
): DiagramLayout => {
  const width =
    HORIZONTAL_PADDING * 2 +
    LANE_GAP * Math.max(participants.length - 1, 0);
  const stepAreaTop = STEP_VERTICAL_OFFSET;
  const height =
    stepAreaTop + STEP_GAP * Math.max(steps.length - 1, 0) + LINE_BOTTOM_PADDING + 80;
  const lineTop = 40;
  const lineBottom = height - 40;

  const participantPositions: ParticipantLayout[] = participants.map((name, index) => ({
    name,
    x: HORIZONTAL_PADDING + index * LANE_GAP,
  }));

  const positionLookup = new Map(participantPositions.map((p) => [p.name, p.x]));

  const stepLayouts: StepLayout[] = steps.map((step, index) => {
    const fromX = positionLookup.get(step.from) ?? participantPositions[0]?.x ?? HORIZONTAL_PADDING;
    const toX = positionLookup.get(step.to) ?? participantPositions[participantPositions.length - 1]?.x ?? HORIZONTAL_PADDING;
    const y = stepAreaTop + STEP_GAP * index;
    const labelX = (fromX + toX) / 2;
    const labelY = y - LABEL_HEIGHT / 2 - 8;

    return {
      ...step,
      index,
      fromX,
      toX,
      y,
      labelX,
      labelY,
    };
  });

  return {
    width,
    height,
    lineTop,
    lineBottom,
    labelWidth: LABEL_WIDTH,
    labelHeight: LABEL_HEIGHT,
    participants: participantPositions,
    steps: stepLayouts,
  };
};

const formatCopyText = (step: HandshakeStep) =>
  `${step.step}: ${step.from} → ${step.to} — ${step.description}`;

const HandshakeVisualizer: React.FC = () => {
  const titleId = useId();
  const layout = useMemo(
    () => computeLayout(PARTICIPANTS, HANDSHAKE_DATA.steps),
    []
  );
  const [copiedStep, setCopiedStep] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  const handleCopy = (step: HandshakeStep) => {
    const text = formatCopyText(step);
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        void navigator.clipboard.writeText(text);
      }
    } catch (error) {
      // Silently ignore clipboard failures in unsupported environments.
    }

    setCopiedStep(step.step);
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }
    resetTimer.current = setTimeout(() => {
      setCopiedStep(null);
    }, 1500);
  };

  const descId = `${titleId}-desc`;
  const diagramDescription = layout.steps
    .map((step) => `${step.step} from ${step.from} to ${step.to}`)
    .join('. ');

  return (
    <section className="bg-gray-800 rounded p-4" aria-labelledby={titleId}>
      <h3 id={titleId} className="text-base font-semibold text-white mb-3">
        {HANDSHAKE_DATA.title}
      </h3>
      <div className="relative">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="w-full h-auto text-gray-200"
          role="img"
          aria-describedby={descId}
        >
          <title>{HANDSHAKE_DATA.title} sequence diagram</title>
          <desc id={descId}>{diagramDescription}</desc>
          <defs>
            <marker
              id="arrow-head"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
              fill="currentColor"
            >
              <polygon points="0 0, 10 3.5, 0 7" />
            </marker>
          </defs>

          {layout.participants.map((participant) => (
            <g key={participant.name}>
              <text
                x={participant.x}
                y={18}
                textAnchor="middle"
                className="fill-gray-100 text-xs uppercase tracking-wide"
              >
                {participant.name}
              </text>
              <circle
                cx={participant.x}
                cy={layout.lineTop}
                r={6}
                className="fill-gray-200"
              />
              <line
                x1={participant.x}
                x2={participant.x}
                y1={layout.lineTop}
                y2={layout.lineBottom}
                strokeWidth={2}
                className="stroke-gray-600"
                strokeDasharray="6 6"
              />
            </g>
          ))}

          {layout.steps.map((step) => (
            <g key={step.step}>
              <line
                x1={step.fromX}
                x2={step.toX}
                y1={step.y}
                y2={step.y}
                strokeWidth={3}
                className="stroke-green-400"
                markerEnd="url(#arrow-head)"
              />
              <text
                x={step.labelX}
                y={step.y - 10}
                textAnchor="middle"
                className="fill-gray-200 text-xs font-semibold"
              >
                {step.step}
              </text>
              <foreignObject
                x={step.labelX - layout.labelWidth / 2}
                y={step.labelY}
                width={layout.labelWidth}
                height={layout.labelHeight}
              >
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  className="pointer-events-auto flex items-center justify-center gap-2"
                >
                  <span className="rounded bg-gray-900/80 px-2 py-1 text-xs text-gray-200 shadow">
                    {step.from} → {step.to}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(step)}
                    className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    aria-label={`Copy ${step.step} details`}
                  >
                    {copiedStep === step.step ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </foreignObject>
            </g>
          ))}
        </svg>
      </div>
      <ol className="mt-4 space-y-3 text-sm text-gray-200">
        {layout.steps.map((step) => (
          <li key={step.step}>
            <span className="font-semibold text-white">{step.step}:</span>{' '}
            {step.description}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default HandshakeVisualizer;
