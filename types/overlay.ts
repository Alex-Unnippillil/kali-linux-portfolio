export type OverlayEventType = 'key' | 'mouse';

export interface OverlayEvent {
  id: string;
  type: OverlayEventType;
  /** Human readable label for the event (e.g. "Ctrl + S" or "Left Click") */
  label: string;
  /** Parts of the key combo when the event is keyboard driven */
  combo?: string[];
  /** Mouse button label when the event is a mouse click */
  button?: string;
  /**
   * Timestamp in milliseconds relative to the start of the recording.
   * Consumers can pair this with `frame` to align with captured footage.
   */
  timestamp: number;
  /** Frame index calculated using the active frame rate at capture time */
  frame: number;
}

export interface FrameMarker {
  frame: number;
  /** Timestamp in milliseconds relative to the start of the recording */
  time: number;
}
