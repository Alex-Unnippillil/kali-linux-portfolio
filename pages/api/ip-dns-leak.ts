import type { NextApiRequest, NextApiResponse } from 'next';

interface TraceInfo {
  [key: string]: string;
}

interface ApiResponse {
  ip?: string;
  traceIp?: string;
  resolver?: TraceInfo;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    const [ipRes, traceRes] = await Promise.all([
      fetch('https://api.ipify.org?format=json'),
      fetch('https://1.1.1.1/cdn-cgi/trace'),
    ]);

    const ipData = await ipRes.json();
    const traceText = await traceRes.text();
    const trace: TraceInfo = traceText
      .trim()
      .split('\n')
      .reduce<TraceInfo>((acc, line) => {
        const [key, value] = line.split('=');
        if (key && value) acc[key] = value;
        return acc;
      }, {});

    res.status(200).json({ ip: ipData.ip, traceIp: trace.ip, resolver: trace });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve information' });
  }
}

