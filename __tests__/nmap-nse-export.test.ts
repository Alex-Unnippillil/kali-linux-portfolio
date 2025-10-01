import {
  DEFAULT_REDACTIONS,
  applyRedactions,
  countRows,
  createRecord,
  iterateRows,
  streamExport,
  toCsvRow,
  toJsonlRow
} from '../components/apps/nmap-nse/Export';
import type { NmapHost, RedactionState } from '../components/apps/nmap-nse/Export';

describe('Nmap NSE export utilities', () => {
  const hosts: NmapHost[] = [
    {
      ip: '192.0.2.10',
      hostname: 'web-01.internal',
      ports: [
        {
          port: 80,
          service: 'http',
          scripts: [
            { name: 'http-title', output: 'Example Domain' },
            { name: 'http-enum', output: '/admin/: Potential admin interface' }
          ]
        }
      ]
    },
    {
      ip: '2001:db8::1',
      ports: [
        {
          port: 21,
          service: 'ftp',
          scripts: [{ name: 'ftp-anon', output: 'password=guest' }]
        }
      ]
    }
  ];

  test('iterateRows yields rows respecting script filters', () => {
    const allRows = Array.from(iterateRows(hosts, []));
    expect(allRows).toHaveLength(3);
    const filteredRows = Array.from(iterateRows(hosts, ['ftp-anon']));
    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0].script?.name).toBe('ftp-anon');
  });

  test('countRows mirrors iterator output', () => {
    expect(countRows(hosts, [])).toBe(3);
    expect(countRows(hosts, ['http-title'])).toBe(1);
  });

  test('applyRedactions masks IPs, hostnames and credentials', () => {
    const row = Array.from(iterateRows(hosts, []))[0];
    const record = createRecord(row, ['host.ip', 'host.hostname', 'script.output']);
    const policy: RedactionState = {
      ...DEFAULT_REDACTIONS,
      maskHostnames: true
    };
    const redacted = applyRedactions(record, policy);
    expect(redacted['host.ip']).toBe('192.0.x.x');
    expect(redacted['host.hostname']).toBe('<redacted-hostname>');
    expect(redacted['script.output']).toBe('Example Domain');

    const ftpRow = Array.from(iterateRows(hosts, ['ftp-anon']))[0];
    const ftpRecord = createRecord(ftpRow, ['script.output']);
    const ftpRedacted = applyRedactions(ftpRecord, DEFAULT_REDACTIONS as RedactionState);
    expect(ftpRedacted['script.output']).toContain('<redacted>');
  });

  test('formatters produce valid CSV and JSONL rows', () => {
    const row = Array.from(iterateRows(hosts, []))[1];
    const record = createRecord(row, ['host.ip', 'script.output']);
    const redacted = applyRedactions(record, DEFAULT_REDACTIONS as RedactionState);
    const csv = toCsvRow(['host.ip', 'script.output'], redacted);
    expect(csv.trim()).toBe('192.0.x.x,/admin/: Potential admin interface');
    const jsonl = toJsonlRow(['host.ip', 'script.output'], redacted);
    expect(jsonl.trim()).toBe('{"host_ip":"192.0.x.x","script_output":"/admin/: Potential admin interface"}');
  });

  test('streamExport emits progress and supports cancellation', async () => {
    const largeHost: NmapHost = {
      ip: '198.51.100.1',
      ports: [
        {
          port: 443,
          service: 'https',
          scripts: Array.from({ length: 2500 }).map((_, index) => ({
            name: `script-${index}`,
            output: `secret=${index}`
          }))
        }
      ]
    };
    const progressUpdates: number[] = [];

    const originalRaf = window.requestAnimationFrame;
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0)
    });

    const anchorClicks: string[] = [];
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = jest.fn(() => 'blob:test');
    window.URL.revokeObjectURL = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = ((tag: string) => {
      const element = originalCreateElement(tag);
      if (tag === 'a') {
        const anchor = element as HTMLAnchorElement;
        anchor.click = () => {
          anchorClicks.push(anchor.download);
        };
      }
      return element;
    }) as typeof document.createElement;

    const controller = new AbortController();
    const exportPromise = streamExport({
      hosts: [largeHost],
      selectedScripts: [],
      fields: ['host.ip', 'script.output'],
      redaction: DEFAULT_REDACTIONS as RedactionState,
      format: 'csv',
      filename: 'test.csv',
      signal: controller.signal,
      onProgress: (processed, _total) => {
        progressUpdates.push(processed);
        if (processed >= 1500) {
          controller.abort();
        }
      }
    });

    await expect(exportPromise).rejects.toMatchObject({ name: 'AbortError' });
    expect(progressUpdates.some((value) => value >= 1000)).toBe(true);

    await streamExport({
      hosts: [hosts[0]],
      selectedScripts: [],
      fields: ['host.ip', 'script.output'],
      redaction: DEFAULT_REDACTIONS as RedactionState,
      format: 'jsonl',
      filename: 'done.jsonl',
      onProgress: (processed) => {
        progressUpdates.push(processed);
      }
    });

    expect(anchorClicks).toContain('done.jsonl');
    expect(progressUpdates[progressUpdates.length - 1]).toBeGreaterThan(0);

    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    document.createElement = originalCreateElement;
    if (originalRaf) {
      window.requestAnimationFrame = originalRaf;
    } else {
      delete (window as Partial<Window> & { requestAnimationFrame?: Window['requestAnimationFrame'] }).requestAnimationFrame;
    }
  });
});
