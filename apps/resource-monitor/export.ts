import { FetchEntry } from '../../lib/fetchProxy';

export function serializeMetrics(entries: FetchEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMetrics(entries: FetchEntry[], filename = 'network-insights.json'): void {
  downloadJson(serializeMetrics(entries), filename);
}
