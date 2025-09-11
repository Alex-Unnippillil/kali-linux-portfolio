// Benchmark for wireshark display filter performance.
// Baseline before caching: ~29.66ms for 100k calls
// After caching optimization: ~26.32ms for 100k calls
import { matchesDisplayFilter, getRowColor } from '../components/apps/wireshark/utils';

describe('display filter benchmark', () => {
  const packets = Array.from({ length: 1000 }, (_, i) => ({
    src: `1.1.1.${i % 255}`,
    dest: `2.2.2.${(i * 2) % 255}`,
    protocol: i % 2 ? 6 : 17,
    info: 'packet'
  }));
  const rules = [
    { expression: 'tcp', color: 'Red' },
    { expression: 'ip.addr == 2.2.2.2', color: 'Blue' }
  ];

  test('getRowColor performance', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      for (const pkt of packets) {
        getRowColor(pkt, rules);
      }
    }
    const elapsed = performance.now() - start;
    // Log the timing so we can compare before/after changes
    console.log(`getRowColor benchmark: ${elapsed.toFixed(2)}ms`);
  });
});

