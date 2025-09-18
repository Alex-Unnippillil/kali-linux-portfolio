import { aggregateTraffic } from '../apps/wireshark/components/trafficStats';
import type { Packet } from '../apps/wireshark/components/trafficTypes';

describe('aggregateTraffic', () => {
  const makePacket = (overrides: Partial<Packet>): Packet => ({
    timestamp: '0',
    src: '',
    dest: '',
    protocol: 0,
    info: '',
    data: new Uint8Array(0),
    length: 0,
    ...overrides,
  });

  it('combines packet and byte counts per source and destination', () => {
    const packets: Packet[] = [
      makePacket({ src: '1.1.1.1', dest: '2.2.2.2', length: 120, data: new Uint8Array(120) }),
      makePacket({ src: '1.1.1.1', dest: '3.3.3.3', length: 80, data: new Uint8Array(80) }),
      makePacket({ src: '4.4.4.4', dest: '2.2.2.2', length: 200, data: new Uint8Array(200) }),
      makePacket({ src: '4.4.4.4', dest: '5.5.5.5', length: 60, data: new Uint8Array(60) }),
    ];

    const { sources, destinations } = aggregateTraffic(packets);

    expect(sources).toEqual([
      { address: '4.4.4.4', packets: 2, bytes: 260 },
      { address: '1.1.1.1', packets: 2, bytes: 200 },
    ]);
    expect(destinations).toEqual([
      { address: '2.2.2.2', packets: 2, bytes: 320 },
      { address: '3.3.3.3', packets: 1, bytes: 80 },
      { address: '5.5.5.5', packets: 1, bytes: 60 },
    ]);
  });

  it('falls back to captured byte length when packet length is missing', () => {
    const packets: Packet[] = [
      makePacket({
        src: '6.6.6.6',
        dest: '7.7.7.7',
        // @ts-expect-error simulate legacy packets without length metadata
        length: undefined,
        data: new Uint8Array(33),
      }),
    ];

    const { sources, destinations } = aggregateTraffic(packets);

    expect(sources[0]).toMatchObject({ bytes: 33, packets: 1 });
    expect(destinations[0]).toMatchObject({ bytes: 33, packets: 1 });
  });
});
