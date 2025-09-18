import fc from 'fast-check';
import {
  IPv4Cidr,
  summarizeSubnets,
  parseCidr,
  ipv4ToNumber,
} from '../modules/networking/subnet';

type NumericRange = {
  start: number;
  end: number;
};

function cidrToRange(cidr: IPv4Cidr): NumericRange {
  const start = ipv4ToNumber(cidr.network);
  const size = Math.pow(2, 32 - cidr.prefix);
  return { start, end: start + size - 1 };
}

function mergeRanges(ranges: NumericRange[]): NumericRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => (a.start === b.start ? a.end - b.end : a.start - b.start));
  const merged: NumericRange[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    if (current.start <= last.end + 1) {
      if (current.end > last.end) {
        last.end = current.end;
      }
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function deriveGaps(union: NumericRange[]): NumericRange[] {
  const gaps: NumericRange[] = [];
  for (let i = 0; i < union.length - 1; i++) {
    const gapStart = union[i].end + 1;
    const gapEnd = union[i + 1].start - 1;
    if (gapStart <= gapEnd) {
      gaps.push({ start: gapStart, end: gapEnd });
    }
  }
  return gaps;
}

describe('summarizeSubnets', () => {
  const cidrArb = fc.array(
    fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 32 }),
      )
      .map(([a, b, c, d, prefix]) => `${a}.${b}.${c}.${d}/${prefix}`),
    { minLength: 1, maxLength: 5 },
  );

  it('produces gap-free coverage equivalent to the original ranges', () => {
    fc.assert(
      fc.property(cidrArb, (entries) => {
        const cidrs = entries.map((entry) => parseCidr(entry));
        const result = summarizeSubnets(cidrs);

        const originalUnion = mergeRanges(cidrs.map(cidrToRange));
        const summarizedRanges = result.subnets.map((subnet) =>
          cidrToRange({ network: subnet.network, prefix: subnet.prefix }),
        );
        const summarizedUnion = mergeRanges(summarizedRanges);

        const sortedSummaries = [...summarizedRanges].sort((a, b) => a.start - b.start);
        for (let i = 1; i < sortedSummaries.length; i++) {
          expect(sortedSummaries[i].start).toBeGreaterThan(sortedSummaries[i - 1].end);
        }

        expect(summarizedUnion).toEqual(originalUnion);

        const expectedTotal = originalUnion.reduce(
          (total, range) => total + (range.end - range.start + 1),
          0,
        );
        expect(result.totalAddresses).toBe(expectedTotal);

        const expectedGaps = deriveGaps(originalUnion);
        const resultGaps = result.gaps.map((gap) => ({
          start: ipv4ToNumber(gap.start),
          end: ipv4ToNumber(gap.end),
        }));
        expect(resultGaps).toEqual(expectedGaps);
        expect(result.isGapFree).toBe(expectedGaps.length === 0);
      }),
    );
  });
});
