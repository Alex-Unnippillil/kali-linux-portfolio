import { FetchEntry } from '../../lib/fetchProxy';
import { blobManager } from '@/utils/blobManager';

export function serializeMetrics(entries: FetchEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function exportMetrics(entries: FetchEntry[], filename = 'network-insights.json'): void {
  const blob = new Blob([serializeMetrics(entries)], { type: 'application/json' });
  const url = blobManager.register(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  blobManager.release(url);
}
