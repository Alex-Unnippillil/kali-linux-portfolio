import { buildPinnedAppsPayload, parsePinnedAppsPayload } from '../utils/taskbarPayload';

describe('taskbar payload helpers', () => {
  const sample = [
    { id: 'terminal', title: 'Terminal' },
    { id: 'settings', title: 'Settings' },
  ];

  it('wraps pinned apps with a typed payload', () => {
    const payload = buildPinnedAppsPayload(sample);
    expect(payload.kind).toBe('taskbar-pinned-apps');
    expect(payload.version).toBe(1);
    expect(payload.items).toEqual(sample);
  });

  it('parses versioned payloads', () => {
    const payload = buildPinnedAppsPayload(sample);
    expect(parsePinnedAppsPayload(payload)).toEqual(sample);
  });

  it('parses legacy arrays and JSON strings', () => {
    expect(parsePinnedAppsPayload(sample)).toEqual(sample);
    expect(parsePinnedAppsPayload(JSON.stringify(sample))).toEqual(sample);
  });

  it('filters invalid entries', () => {
    const payload = buildPinnedAppsPayload([{ id: 'about' }, null, { title: 'missing' }]);
    expect(parsePinnedAppsPayload(payload)).toEqual([{ id: 'about' }]);
  });
});
