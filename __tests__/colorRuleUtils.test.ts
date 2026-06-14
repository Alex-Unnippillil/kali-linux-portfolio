import {
  buildPacketRowMetadata,
  parseColorRules,
  serializeColorRules,
} from '../apps/wireshark/components/colorRuleUtils';

const samplePackets = [
  {
    timestamp: '1',
    src: '1.1.1.1',
    dest: '2.2.2.2',
    protocol: 6,
    info: 'tcp packet',
  },
  {
    timestamp: '2',
    src: '3.3.3.3',
    dest: '4.4.4.4',
    protocol: 17,
    info: 'udp packet',
  },
];

describe('colorRuleUtils', () => {
  it('serializes color rules with trimming', () => {
    const json = serializeColorRules([
      { expression: ' tcp ', color: ' Red ' },
      { expression: 'ip.addr == 4.4.4.4', color: 'Blue' },
    ]);

    expect(json).toBe(
      JSON.stringify(
        [
          { expression: 'tcp', color: 'Red' },
          { expression: 'ip.addr == 4.4.4.4', color: 'Blue' },
        ],
        null,
        2,
      ),
    );
  });

  it('parses rule JSON safely', () => {
    const parsed = parseColorRules(
      JSON.stringify([
        { expression: 'udp', color: 'Green' },
        { expression: 123, color: null },
        'not-a-rule',
      ]),
    );

    expect(parsed).toEqual([
      { expression: 'udp', color: 'Green' },
      { expression: '', color: '' },
      { expression: '', color: '' },
    ]);
  });

  it('returns empty array for malformed JSON', () => {
    expect(parseColorRules('{ not valid json }')).toEqual([]);
    expect(parseColorRules(JSON.stringify({ foo: 'bar' }))).toEqual([]);
  });

  it('builds row metadata using display filters and rules', () => {
    const metadata = buildPacketRowMetadata(samplePackets, 'udp', [
      { expression: 'tcp', color: 'Red' },
    ]);

    expect(metadata).toHaveLength(2);
    expect(metadata[0].matchesFilter).toBe(false);
    expect(metadata[0].colorClass).toBe('text-red-500');
    expect(metadata[1].matchesFilter).toBe(true);
    expect(metadata[1].colorClass).toBe('');
  });
});
