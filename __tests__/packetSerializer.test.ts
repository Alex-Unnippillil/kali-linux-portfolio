import captureTemplates from '../apps/wireshark/templates';
import {
  deserializeCapture,
  serializeCapture,
  snapshotFingerprint,
} from '../utils/network/packetSerializer';

describe('packetSerializer', () => {
  it.each(Object.entries(captureTemplates))(
    'round-trips the %s template without data loss',
    (_, snapshot) => {
      const json = JSON.stringify(snapshot);
      const frames = deserializeCapture(json);
      const canonical = serializeCapture(frames);

      expect(JSON.parse(canonical)).toEqual(JSON.parse(json));

      const replay = deserializeCapture(canonical);
      expect(serializeCapture(replay)).toBe(canonical);
      expect(snapshotFingerprint(frames)).toBe(snapshotFingerprint(replay));
    }
  );

  it('rejects unsupported snapshot versions', () => {
    expect(() =>
      deserializeCapture(JSON.stringify({ version: 99, frames: [] }))
    ).toThrow('Unsupported capture snapshot version');
  });

  it('rejects malformed frame payloads', () => {
    expect(() =>
      deserializeCapture(
        JSON.stringify({ version: 1, frames: [{}, { timestamp: 1 }] })
      )
    ).toThrow('Frame 0 is missing required address metadata');
  });
});
