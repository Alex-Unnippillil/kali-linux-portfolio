import { useEffect, useMemo } from 'react';

type AnyRef = { current: HTMLElement | null } | null;

type Options = {
  enabled?: boolean;
  events?: Array<keyof DocumentEventMap>; // default: ['pointerdown']
  onEscape?: boolean; // default: true
};

export function useClickOutside(
  refs: AnyRef | AnyRef[],
  handler: (evt: Event) => void,
  opts: Options = {}
) {
  const { enabled = true, events = ['pointerdown'], onEscape = true } = opts;
  const eventList = useMemo(() => [...events], [events]);

  useEffect(() => {
    if (!enabled) return;

    const refList = Array.isArray(refs) ? refs : [refs];

    const isInside = (target: EventTarget | null) =>
      refList.some(r => {
        const el = r && 'current' in r ? r.current : null;
        return el && target instanceof Node && el.contains(target);
      });

    const onDoc = (evt: Event) => {
      if (onEscape && (evt as KeyboardEvent).key === 'Escape') {
        handler(evt);
        return;
      }
      const t = evt.target as Node | null;
      if (!isInside(t)) handler(evt);
    };

    eventList.forEach(e => document.addEventListener(e, onDoc, true));
    if (onEscape) document.addEventListener('keydown', onDoc, true);

    return () => {
      eventList.forEach(e => document.removeEventListener(e, onDoc, true));
      if (onEscape) document.removeEventListener('keydown', onDoc, true);
    };
  }, [refs, handler, enabled, eventList, onEscape]);
}
