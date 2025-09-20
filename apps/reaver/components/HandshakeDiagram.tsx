import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import handshakeCapture from '../data/handshakeCapture.json';

export interface SequenceParticipant {
  id: string;
  label: string;
  accent: string;
}

export interface SequenceMessage {
  step: string;
  from: string;
  to: string;
  summary: string;
  description: string;
  relativeTime: number;
  frame: number;
}

export interface HandshakeCapture {
  id: string;
  title: string;
  capture: {
    source: string;
    tool: string;
    notes: string;
  };
  timeUnit: string;
  participants: SequenceParticipant[];
  messages: SequenceMessage[];
}

export interface ParticipantNode extends SequenceParticipant {
  x: number;
}

export interface MessageNode extends SequenceMessage {
  startX: number;
  endX: number;
  midX: number;
  y: number;
  direction: 'left' | 'right';
  labelX: number;
  labelWidth: number;
  color: string;
  copyText: string;
}

export interface DiagramModel {
  width: number;
  height: number;
  lifelineTop: number;
  lifelineBottom: number;
  participants: ParticipantNode[];
  messages: MessageNode[];
  minFrame: number;
  maxFrame: number;
  duration: number;
}

export const HEADER_HEIGHT = 64;
export const ROW_HEIGHT = 96;
export const LANE_SPACING = 220;
export const LEFT_MARGIN = 48;
export const RIGHT_MARGIN = 48;
export const BOTTOM_MARGIN = 48;
export const LABEL_WIDTH = 200;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const handshakeCaptureData = handshakeCapture as HandshakeCapture;

export const createDiagramModel = (capture: HandshakeCapture): DiagramModel => {
  const participants: ParticipantNode[] = capture.participants.map(
    (participant, index) => ({
      ...participant,
      x: LEFT_MARGIN + LANE_SPACING * index,
    })
  );

  const width =
    (participants.length > 0
      ? participants[participants.length - 1].x
      : LEFT_MARGIN) + RIGHT_MARGIN;

  const sortedMessages = [...capture.messages].sort((a, b) => {
    if (a.relativeTime === b.relativeTime) {
      return a.frame - b.frame;
    }
    return a.relativeTime - b.relativeTime;
  });

  const height = HEADER_HEIGHT + BOTTOM_MARGIN + ROW_HEIGHT * sortedMessages.length;
  const lifelineTop = HEADER_HEIGHT - 10;
  const lifelineBottom = height - BOTTOM_MARGIN / 2;

  let minFrame = Number.POSITIVE_INFINITY;
  let maxFrame = Number.NEGATIVE_INFINITY;
  let duration = 0;

  const messages: MessageNode[] = sortedMessages.map((message, index) => {
    const from = participants.find((p) => p.id === message.from);
    const to = participants.find((p) => p.id === message.to);

    if (!from || !to) {
      throw new Error(`Message references unknown participant: ${message.step}`);
    }

    const y = HEADER_HEIGHT + ROW_HEIGHT * index + ROW_HEIGHT / 2;
    const direction: 'left' | 'right' = from.x <= to.x ? 'right' : 'left';
    const startX = from.x;
    const endX = to.x;
    const midX = (startX + endX) / 2;
    const labelWidth = LABEL_WIDTH;
    const labelX = clamp(midX - labelWidth / 2, 8, width - labelWidth - 8);
    const copyText = `${message.step} – ${message.summary}`;

    minFrame = Math.min(minFrame, message.frame);
    maxFrame = Math.max(maxFrame, message.frame);
    duration = Math.max(duration, message.relativeTime);

    return {
      ...message,
      startX,
      endX,
      midX,
      y,
      direction,
      labelX,
      labelWidth,
      color: from.accent,
      copyText,
    };
  });

  if (!Number.isFinite(minFrame)) {
    minFrame = 0;
    maxFrame = 0;
  }

  return {
    width,
    height,
    lifelineTop,
    lifelineBottom,
    participants,
    messages,
    minFrame,
    maxFrame,
    duration,
  };
};

type CopyFeedback = {
  step: string;
  label: string;
  error?: boolean;
};

const HandshakeDiagram: React.FC = () => {
  const model = useMemo(
    () => createDiagramModel(handshakeCaptureData),
    []
  );
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFeedback = useCallback((feedback: CopyFeedback | null) => {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }

    setCopyFeedback(feedback);

    if (feedback) {
      feedbackTimer.current = setTimeout(() => {
        setCopyFeedback(null);
        feedbackTimer.current = null;
      }, 2000);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  const fallbackCopy = useCallback((text: string) => {
    if (typeof document === 'undefined') return;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }, []);

  const copyStep = useCallback(
    async (message: MessageNode) => {
      const text = message.copyText;
      try {
        if (
          typeof navigator !== 'undefined' &&
          navigator.clipboard &&
          'writeText' in navigator.clipboard
        ) {
          await navigator.clipboard.writeText(text);
        } else {
          fallbackCopy(text);
        }
        scheduleFeedback({ step: message.step, label: text });
      } catch (error) {
        scheduleFeedback({ step: message.step, label: text, error: true });
      }
    },
    [fallbackCopy, scheduleFeedback]
  );

  const arrowHeadSize = 7;

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 shadow-inner">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {handshakeCaptureData.title}
          </h3>
          <p className="text-xs text-slate-300">
            Sequence reconstructed from {handshakeCaptureData.capture.tool} sample
            capture <span className="font-mono">{handshakeCaptureData.capture.source}</span>.
          </p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>
            Frames {model.minFrame}–{model.maxFrame}
          </div>
          <div>
            Duration {model.duration.toFixed(3)} {handshakeCaptureData.timeUnit}
          </div>
        </div>
      </div>
      <figure
        className="w-full overflow-x-auto"
        aria-labelledby="handshake-diagram-title"
        aria-describedby="handshake-diagram-description"
      >
        <svg
          viewBox={`0 0 ${model.width} ${model.height}`}
          width="100%"
          height={model.height}
          role="img"
          className="max-w-full"
        >
          <title id="handshake-diagram-title">{handshakeCaptureData.title}</title>
          <desc id="handshake-diagram-description">
            WPA2 four-way handshake sequence diagram showing message direction and
            capture timing.
          </desc>

          {model.participants.map((participant) => (
            <g key={participant.id}>
              <text
                x={participant.x}
                y={20}
                textAnchor="middle"
                className="fill-slate-100 text-sm font-semibold"
              >
                {participant.label}
              </text>
              <line
                x1={participant.x}
                y1={model.lifelineTop}
                x2={participant.x}
                y2={model.lifelineBottom}
                stroke="#475569"
                strokeDasharray="6 6"
                strokeWidth={1.5}
                data-testid="handshake-lifeline"
              />
            </g>
          ))}

          {model.messages.map((message) => {
            const arrowPoints =
              message.direction === 'right'
                ? `${message.endX},${message.y} ${message.endX - arrowHeadSize},${
                    message.y - arrowHeadSize / 1.6
                  } ${message.endX - arrowHeadSize},${message.y + arrowHeadSize / 1.6}`
                : `${message.endX},${message.y} ${message.endX + arrowHeadSize},${
                    message.y - arrowHeadSize / 1.6
                  } ${message.endX + arrowHeadSize},${message.y + arrowHeadSize / 1.6}`;

            return (
              <g key={message.step}>
                <line
                  x1={message.startX}
                  y1={message.y}
                  x2={message.endX}
                  y2={message.y}
                  stroke={message.color}
                  strokeWidth={2.5}
                  data-testid="handshake-arrow"
                />
                <polygon points={arrowPoints} fill={message.color} />
                <circle
                  cx={message.startX}
                  cy={message.y}
                  r={4}
                  fill={message.color}
                  opacity={0.7}
                />
                <foreignObject
                  x={message.labelX}
                  y={message.y - 46}
                  width={message.labelWidth}
                  height={82}
                >
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    className="rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm text-slate-100">
                        {message.step}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyStep(message)}
                        className="rounded bg-slate-800 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
                        aria-label={`Copy ${message.step} label`}
                        data-step={message.step}
                      >
                        Copy
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-200">
                      {message.summary}
                    </p>
                    <p className="mt-1 text-[10px] font-mono text-slate-400">
                      Δ {message.relativeTime.toFixed(3)} {handshakeCaptureData.timeUnit} · frame {message.frame}
                    </p>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>
      </figure>
      {copyFeedback && (
        <div
          className={`mt-3 inline-flex items-center rounded px-2 py-1 text-xs ${
            copyFeedback.error
              ? 'bg-red-900/70 text-red-200'
              : 'bg-emerald-900/60 text-emerald-200'
          }`}
        >
          {copyFeedback.error
            ? `Unable to copy ${copyFeedback.label}`
            : `${copyFeedback.label} copied to clipboard`}
        </div>
      )}
      <p className="mt-3 text-xs text-slate-400">
        {handshakeCaptureData.capture.notes}
      </p>
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        data-testid="copy-feedback"
      >
        {copyFeedback
          ? copyFeedback.error
            ? `Unable to copy ${copyFeedback.label}`
            : `${copyFeedback.label} copied to clipboard`
          : ''}
      </div>
    </section>
  );
};

export default HandshakeDiagram;
