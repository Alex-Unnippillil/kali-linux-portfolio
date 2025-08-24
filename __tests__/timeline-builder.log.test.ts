import { parseLogText, filterEvents } from '@components/apps/timeline-builder';
import fs from 'fs';
import path from 'path';

describe('timeline builder log parsing', () => {
  const logPath = path.join(__dirname, '..', 'data', 'sample-logs.log');
  const sample = fs.readFileSync(logPath, 'utf-8');

  it('parses logs into events with tags', () => {
    const events = parseLogText(sample);
    expect(events).toHaveLength(3);
    expect(events[0].tags).toEqual(['start']);
    expect(events[2].tags).toEqual(['error', 'system']);
  });

  it('filters events by search term', () => {
    const events = parseLogText(sample);
    const filtered = filterEvents(events, 'error');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].event).toMatch(/Failure/);
  });
});
