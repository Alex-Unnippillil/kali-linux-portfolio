import type { Report } from '../components/ReportView';
import parseNmapXml from '../utils/parseNmapXml';

self.onmessage = ({ data }: MessageEvent<string>) => {
  try {
    const report: Report = parseNmapXml(data);
    self.postMessage(report);
  } catch (err: any) {
    self.postMessage({ error: err?.message || 'Parse failed' });
  }
};

export {};
