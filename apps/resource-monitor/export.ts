import { FetchEntry } from '../../lib/fetchProxy.mts';

export function serializeMetrics(entries: FetchEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function exportMetrics(entries: FetchEntry[], filename = 'network-insights.json'): void {
  const blob = new Blob([serializeMetrics(entries)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
