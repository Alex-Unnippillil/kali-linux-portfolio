import { FrameMarker, OverlayEvent } from '../types/overlay';

const MODIFIER_ORDER: Array<{ key: keyof KeyboardEvent; label: string }> = [
  { key: 'ctrlKey', label: 'Ctrl' },
  { key: 'altKey', label: 'Alt' },
  { key: 'shiftKey', label: 'Shift' },
  { key: 'metaKey', label: 'Meta' },
];

/**
 * Normalises a keyboard event into ordered, human readable combo parts.
 */
export const formatKeyCombo = (
  event: Pick<
    KeyboardEvent,
    'key' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'
  >,
): string[] => {
  const parts: string[] = [];
  MODIFIER_ORDER.forEach(({ key, label }) => {
    if (event[key]) {
      parts.push(label);
    }
  });
  const base = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  const normalised = base === ' ' ? 'Space' : base;
  if (normalised) {
    parts.push(normalised);
  }
  return parts;
};

/**
 * Calculates the video frame index for a timestamp relative to the start of a
 * recording session. Returns 0 when information is incomplete.
 */
export const computeFrameIndex = (
  now: number,
  startTime: number | null,
  frameRate: number,
): number => {
  if (!startTime || frameRate <= 0) return 0;
  const elapsed = Math.max(0, now - startTime);
  return Math.round((elapsed / 1000) * frameRate);
};

/**
 * Keeps track of previous events to reduce noisy repeats. Returns `true` when
 * the event should be recorded and updates the internal map with the latest
 * timestamp.
 */
export const shouldRecordEvent = (
  label: string,
  timestamp: number,
  threshold: number,
  lastEvents: Map<string, number>,
): boolean => {
  if (threshold <= 0) {
    lastEvents.set(label, timestamp);
    return true;
  }
  const last = lastEvents.get(label);
  if (last !== undefined && timestamp - last < threshold) {
    return false;
  }
  lastEvents.set(label, timestamp);
  return true;
};

/**
 * Case-insensitive check to see if a combo part should be ignored.
 */
export const shouldIgnoreKey = (
  part: string,
  ignoreList: Iterable<string>,
): boolean => {
  const normalised = part.trim().toLowerCase();
  for (const item of ignoreList) {
    if (item.trim().toLowerCase() === normalised) {
      return true;
    }
  }
  return false;
};

/**
 * Sanitises a list of ignore entries into a unique, lower case array.
 */
export const sanitizeIgnoreList = (list: string[]): string[] => {
  const seen = new Set<string>();
  list
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      seen.add(item.toLowerCase());
    });
  return Array.from(seen);
};

/**
 * Converts a list of frame markers to overlay events, useful when generating
 * placeholder events for testing sync logic.
 */
export const mapFramesToEvents = (
  frames: FrameMarker[],
  labelFactory: (frame: FrameMarker, index: number) => string,
): OverlayEvent[] =>
  frames.map((frame, index) => ({
    id: `${frame.frame}-${index}`,
    type: 'mouse',
    label: labelFactory(frame, index),
    timestamp: frame.time,
    frame: frame.frame,
  }));
