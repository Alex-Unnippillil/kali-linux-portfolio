import type { NextApiRequest, NextApiResponse } from 'next';

interface NetworkSample {
  seq: number;
  timestamp: string;
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
  jitterMs: number;
  packetLoss: number;
}

type NetworkSampleResponse =
  | NetworkSample
  | { samples: NetworkSample[] }
  | { error: string };

const START_TIME = Date.UTC(2024, 0, 1, 0, 0, 0);

const round = (value: number, precision = 2) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const toSample = (index: number): NetworkSample => {
  const seq = Number.isFinite(index) ? index : 0;
  const baseTime = START_TIME + Math.max(0, seq) * 15_000;
  const wave = Math.sin(seq * 0.9);
  const phase = Math.cos(seq * 0.6);

  const download = 320 + wave * 45 + ((seq % 5) - 2) * 6;
  const upload = 140 + phase * 20 + ((seq % 4) - 1.5) * 4;
  const latency = 18 + Math.abs(Math.sin(seq * 0.4)) * 8 + (seq % 3) * 1.5;
  const jitter = 2 + Math.abs(Math.cos(seq * 1.2)) * 3;
  const loss = 0.05 + Math.abs(Math.sin(seq * 0.8)) * 0.25 + (seq % 12 === 0 ? 0.3 : 0);

  return {
    seq,
    timestamp: new Date(baseTime).toISOString(),
    downloadMbps: round(Math.max(download, 0)),
    uploadMbps: round(Math.max(upload, 0)),
    latencyMs: round(Math.max(latency, 0)),
    jitterMs: round(Math.max(jitter, 0), 3),
    packetLoss: round(Math.min(Math.max(loss, 0), 5), 3),
  };
};

const parseNumber = (value: string | string[] | undefined, fallback: number) => {
  if (Array.isArray(value)) {
    const first = value[0];
    const parsed = Number(first);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<NetworkSampleResponse>,
) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const countParam = parseNumber(req.query.count, 1);
  const startParam = parseNumber(req.query.start, 0);

  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (countParam > 1) {
    const limit = Math.min(Math.max(Math.floor(countParam), 1), 20);
    const start = Number.isFinite(startParam) ? startParam : 0;
    const samples = Array.from({ length: limit }, (_, idx) => toSample(start + idx));
    res.status(200).json({ samples });
    return;
  }

  const seqParam = parseNumber(req.query.seq, startParam);
  const sample = toSample(seqParam);
  res.status(200).json(sample);
}
