import fixtures from '../apps/wireshark/fixtures';

describe('Wireshark fixtures', () => {
  it('normalizes packet payloads for lab previews', () => {
    fixtures.forEach((fixture) => {
      expect(fixture.packets.length).toBeGreaterThan(0);
      fixture.packets.forEach((packet) => {
        expect(packet.data).toBeInstanceOf(Uint8Array);
        if (packet.data.length > 0) {
          expect(packet.len).toBe(packet.data.length);
        }
        expect(typeof packet.timestamp).toBe('string');
        expect(packet.layers).toBeDefined();
      });
    });
  });
});
