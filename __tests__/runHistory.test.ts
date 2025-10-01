import { performance } from 'perf_hooks';
import {
  addRunHistoryEntry,
  filterHistoryEntries,
  getLastRunForTool,
  prepareHistoryEntries,
  resetRunHistory,
} from '../utils/runHistory';

describe('run history utilities', () => {
  beforeEach(() => {
    resetRunHistory();
  });

  it('filters 500 entries in under 100ms with combined filters', () => {
    const base = Date.now();
    const entries = Array.from({ length: 500 }, (_, idx) => ({
      id: `run-${idx}`,
      tool: idx % 3 === 0 ? 'nmap' : idx % 3 === 1 ? 'hydra' : 'hashcat',
      command: `command ${idx}`,
      summary: `summary ${idx}`,
      createdAt: base - idx * 1000,
      tags: [`tag${idx % 10}`, idx % 2 === 0 ? 'fast' : 'slow'],
      notes: idx % 7 === 0 ? 'important run' : '',
      options: { index: idx },
    }));

    const prepared = prepareHistoryEntries(entries);

    const start = performance.now();
    const filtered = filterHistoryEntries(prepared, {
      query: 'command',
      tags: ['tag1'],
      tool: 'hydra',
      tools: undefined,
    });
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
    expect(filtered.every((entry) => entry.tool === 'hydra')).toBe(true);
    expect(filtered.every((entry) => entry.searchText.includes('command'))).toBe(
      true
    );
  });

  it('returns the latest options snapshot for reruns', () => {
    addRunHistoryEntry({
      tool: 'hydra',
      summary: 'Initial hydra run',
      command: 'hydra -L users -P passes ssh://target',
      createdAt: Date.now() - 5000,
      tags: ['ssh'],
      options: { target: 'first', service: 'ssh' },
    });
    const latest = addRunHistoryEntry({
      tool: 'hydra',
      summary: 'Hydra retry',
      command: 'hydra -L better -P better ftp://internal',
      tags: ['ftp'],
      options: { target: 'internal', service: 'ftp', selectedUser: 'better' },
    });

    const run = getLastRunForTool('hydra');
    expect(run?.id).toEqual(latest.id);
    expect(run?.options).toEqual(latest.options);
  });
});
