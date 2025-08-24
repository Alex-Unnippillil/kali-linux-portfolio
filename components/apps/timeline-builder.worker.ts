import type { TimelineEvent } from './timeline-builder';

self.onmessage = (e: MessageEvent<TimelineEvent[]>) => {
  const events = e.data || [];
  const groups: { id: number; content: string }[] = [];
  const groupIds = new Map<string, number>();
  const items = events.map((evt, idx) => {
    let group: number | undefined;
    const label = evt.group || evt.tags?.[0];
    if (label) {
      if (!groupIds.has(label)) {
        const id = groupIds.size + 1;
        groupIds.set(label, id);
        groups.push({ id, content: label });
      }
      group = groupIds.get(label);
    }
    return {
      id: idx,
      content:
        evt.event + (evt.tags && evt.tags.length ? ` [${evt.tags.join(',')}]` : ''),
      start: evt.time,
      end: evt.end,
      group,
      link: evt.link,
    };
  });
  (self as unknown as Worker).postMessage({ items, groups });
};

export default null as any;
