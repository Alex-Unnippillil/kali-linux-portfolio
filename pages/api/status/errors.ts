import type { NextApiRequest, NextApiResponse } from 'next';

interface ErrorService {
  name: string;
  errorRate: number;
  target: number;
}

interface ErrorResponse {
  updatedAt: string;
  services: ErrorService[];
}

const SERVICES: Array<Pick<ErrorService, 'name' | 'target'> & { baseline: number; variance: number }> = [
  { name: 'api-gateway', target: 0.015, baseline: 0.008, variance: 0.01 },
  { name: 'auth-service', target: 0.02, baseline: 0.012, variance: 0.015 },
  { name: 'job-processor', target: 0.025, baseline: 0.018, variance: 0.02 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const drift = (baseline: number, variance: number) => {
  const offset = (Math.random() - 0.5) * variance * 2;
  return clamp(baseline + offset, 0, 0.25);
};

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse<ErrorResponse>,
) {
  const services: ErrorService[] = SERVICES.map((service) => ({
    name: service.name,
    target: service.target,
    errorRate: parseFloat(drift(service.baseline, service.variance).toFixed(4)),
  }));

  res.status(200).json({
    updatedAt: new Date().toISOString(),
    services,
  });
}
