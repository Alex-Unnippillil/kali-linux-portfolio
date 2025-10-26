'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  computeFrameIndex,
  formatKeyCombo,
  shouldIgnoreKey,
  shouldRecordEvent,
} from '../../../utils/overlay';
import { OverlayEvent } from '../../../types/overlay';

interface InputOverlayProps {
  recording: boolean;
  frameRate: number;
  startTime: number | null;
  opacity: number;
  ignoreKeys: string[];
  noiseThreshold: number;
  showKeyboard: boolean;
  showMouse: boolean;
  onRecord: (event: OverlayEvent) => void;
}

interface DisplayEvent extends OverlayEvent {
  until: number;
}

const DISPLAY_DURATION = 900; // ms each entry remains visible
const MAX_VISIBLE = 6;

const mouseLabel = (button: number): string => {
  switch (button) {
    case 0:
      return 'Left Click';
    case 1:
      return 'Middle Click';
    case 2:
      return 'Right Click';
    default:
      return `Button ${button}`;
  }
};

const InputOverlay: React.FC<InputOverlayProps> = ({
  recording,
  frameRate,
  startTime,
  opacity,
  ignoreKeys,
  noiseThreshold,
  showKeyboard,
  showMouse,
  onRecord,
}) => {
  const [displayEvents, setDisplayEvents] = useState<DisplayEvent[]>([]);
  const lastEventsRef = useRef<Map<string, number>>(new Map());
  const startRef = useRef<number | null>(null);
  const ignoreSet = useMemo(() => new Set(ignoreKeys.map((key) => key.toLowerCase())), [ignoreKeys]);

  useEffect(() => {
    if (recording && startTime !== null) {
      startRef.current = startTime;
      lastEventsRef.current.clear();
    } else if (!recording) {
      startRef.current = null;
      lastEventsRef.current.clear();
    }
  }, [recording, startTime]);

  useEffect(() => {
    const cleanup = window.setInterval(() => {
      const now = performance.now();
      setDisplayEvents((events) => events.filter((event) => event.until > now));
    }, 120);
    return () => window.clearInterval(cleanup);
  }, []);

  const pushDisplayEvent = (event: OverlayEvent, now: number) => {
    setDisplayEvents((events) => {
      const filtered = events.filter((entry) => entry.until > now);
      const next: DisplayEvent[] = [...filtered, { ...event, until: now + DISPLAY_DURATION }];
      return next.slice(-MAX_VISIBLE);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showKeyboard) return;
      const now = performance.now();
      const parts = formatKeyCombo(e);
      if (parts.length === 0) return;
      if (parts.some((part) => shouldIgnoreKey(part, ignoreSet))) return;
      const label = parts.join(' + ');
      if (!shouldRecordEvent(label, now, noiseThreshold, lastEventsRef.current)) {
        return;
      }
      const start = startRef.current;
      const overlayEvent: OverlayEvent = {
        id: `${now}-${label}`,
        type: 'key',
        label,
        combo: parts,
        timestamp: start !== null ? now - start : 0,
        frame: computeFrameIndex(now, start, frameRate),
      };
      pushDisplayEvent(overlayEvent, now);
      if (recording && start !== null) {
        onRecord(overlayEvent);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [frameRate, ignoreSet, noiseThreshold, onRecord, recording, showKeyboard]);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      if (!showMouse) return;
      const now = performance.now();
      const label = mouseLabel(e.button);
      if (!shouldRecordEvent(label, now, noiseThreshold, lastEventsRef.current)) {
        return;
      }
      const start = startRef.current;
      const overlayEvent: OverlayEvent = {
        id: `${now}-${label}`,
        type: 'mouse',
        label,
        button: label,
        timestamp: start !== null ? now - start : 0,
        frame: computeFrameIndex(now, start, frameRate),
      };
      pushDisplayEvent(overlayEvent, now);
      if (recording && start !== null) {
        onRecord(overlayEvent);
      }
    };

    window.addEventListener('mousedown', handleMouse);
    return () => {
      window.removeEventListener('mousedown', handleMouse);
    };
  }, [frameRate, noiseThreshold, onRecord, recording, showMouse]);

  if (displayEvents.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-8 right-8 z-50 flex max-w-sm flex-col space-y-2 text-sm"
      style={{ opacity }}
      aria-live="polite"
    >
      {displayEvents.map((event) => (
        <div
          key={event.id}
          className="rounded bg-black/70 px-3 py-2 text-white shadow-lg backdrop-blur"
          data-event-type={event.type}
        >
          <span className="font-semibold">{event.label}</span>
          <span className="ml-2 text-xs text-gray-300">
            {`${(event.timestamp / 1000).toFixed(2)}s • f${event.frame}`}
          </span>
        </div>
      ))}
    </div>
  );
};

export default InputOverlay;
