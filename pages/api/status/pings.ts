import type { NextApiRequest, NextApiResponse } from 'next';

interface PingRegion {
  name: string;
  latencyMs: number;
  slaMs: number;
}

interface PingResponse {
  updatedAt: string;
  regions: PingRegion[];
}

const BASELINE_REGIONS: Array<Pick<PingRegion, 'name' | 'slaMs'> & { baseline: number; variance: number }> = [
  { name: 'us-east', slaMs: 220, baseline: 140, variance: 40 },
  { name: 'us-west', slaMs: 240, baseline: 160, variance: 60 },
  { name: 'eu-central', slaMs: 210, baseline: 150, variance: 45 },
  { name: 'ap-southeast', slaMs: 260, baseline: 190, variance: 70 },
];

const jitter = (baseline: number, variance: number) => {
  const offset = (Math.random() - 0.5) * variance * 2;
  return Math.max(45, Math.round(baseline + offset));
};

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<PingResponse>,
) {
  const regions: PingRegion[] = BASELINE_REGIONS.map((region) => ({
    name: region.name,
    slaMs: region.slaMs,
    latencyMs: jitter(region.baseline, region.variance),
  }));

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    regions,
  });
}
