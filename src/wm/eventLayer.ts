import { EventEmitter } from 'events';

export type FocusSource = 'mouse' | 'keyboard' | 'other';
export interface FocusEvent { id: string; source?: FocusSource }
export interface RaiseEvent { id: string; }

type EventName = 'focus' | 'raise';

class WMEventLayer extends EventEmitter {
  private debounceTimers: Partial<Record<EventName, NodeJS.Timeout>> = {};
  private pending: Partial<Record<EventName, any>> = {};
  private lastMouseFocus = 0;
  private DEBOUNCE_MS = 50;
  private CLICK_GUARD_MS = 100;

  private emitDebounced(event: EventName, payload: any) {
    this.pending[event] = payload;
    if (!this.debounceTimers[event]) {
      this.debounceTimers[event] = setTimeout(() => {
        const data = this.pending[event];
        this.debounceTimers[event] = undefined;
        this.emit(event, data);
      }, this.DEBOUNCE_MS);
    }
  }

  focus(payload: FocusEvent) {
    const now = Date.now();
    const source = payload.source || 'other';
    if (source === 'keyboard' && now - this.lastMouseFocus < this.CLICK_GUARD_MS) {
      return; // don't steal focus from recent click
    }
    if (source === 'mouse') {
      this.lastMouseFocus = now;
    }
    this.emitDebounced('focus', payload);
  }

  raise(payload: RaiseEvent) {
    this.emitDebounced('raise', payload);
  }
}

const wmEvents = new WMEventLayer();
export default wmEvents;
