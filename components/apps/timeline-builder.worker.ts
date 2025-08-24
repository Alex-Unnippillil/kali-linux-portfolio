import type { TimelineEvent } from './timeline-builder';

self.onmessage = (e: MessageEvent<TimelineEvent[]>) => {
  const events = e.data || [];
  const groups: { id: number; content: string }[] = [];
  const groupIds = new Map<string, number>();
  const items = events.map((evt, idx) => {
    let group: number | undefined;
    if (evt.group) {
      if (!groupIds.has(evt.group)) {
        const id = groupIds.size + 1;
        groupIds.set(evt.group, id);
        groups.push({ id, content: evt.group });
      }
      group = groupIds.get(evt.group);
    }
    return {
      id: idx,
      content: evt.event,
      start: evt.time,
      end: evt.end,
      group,
      link: evt.link,
    };
  });
  (self as unknown as Worker).postMessage({ items, groups });
};

export default null as any;
