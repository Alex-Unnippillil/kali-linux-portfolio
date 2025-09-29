import { computeAggregatedTotal, computeSeverityTimeline } from '../apps/openvas/analytics';
import { sampleData } from '../apps/openvas/data';
import { severityTimelineFixture } from '../apps/openvas/__fixtures__/severityTimeline';

const countVulnerabilities = () =>
  sampleData.reduce((sum, host) => sum + host.vulns.length, 0);

describe('OpenVAS severity analytics', () => {
  it('matches the fixture timeline totals', () => {
    const timeline = computeSeverityTimeline(sampleData);
    expect(timeline).toEqual(severityTimelineFixture);
  });

  it('aggregated totals equal the vulnerability count', () => {
    const timeline = computeSeverityTimeline(sampleData);
    const aggregated = computeAggregatedTotal(timeline);
    expect(aggregated).toBe(countVulnerabilities());
  });
});
