export interface VolatilitySegment {
  size: number;
  type: string;
}

export interface VolatilityProcessNode {
  pid: number;
  name: string;
  children?: VolatilityProcessNode[];
}

export interface VolatilityDllEntry {
  base: string;
  name: string;
}

export interface VolatilityFinding {
  pid: number;
  address: string;
  [key: string]: string | number;
}

export interface VolatilityYaraFinding extends VolatilityFinding {
  rule: string;
  heuristic: string;
}

export interface VolatilityMemoryFixture {
  segments: VolatilitySegment[];
  pstree: VolatilityProcessNode[];
  dlllist: Record<string, VolatilityDllEntry[]>;
  netscan?: Record<string, unknown>[];
  malfind: VolatilityFinding[];
  yarascan: VolatilityYaraFinding[];
}

export interface VolatilityTableColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => unknown;
}

export interface VolatilityTableFixture {
  columns: VolatilityTableColumn[];
  rows: Record<string, unknown>[];
}

export const buildVolatilityMemoryFixture = (
  overrides: Partial<VolatilityMemoryFixture> = {},
): VolatilityMemoryFixture => {
  const base: VolatilityMemoryFixture = {
    segments: [
      { size: 1000, type: 'process' },
      { size: 1000, type: 'dll' },
      { size: 1000, type: 'socket' },
    ],
    pstree: [
      {
        pid: 4,
        name: 'System',
        children: [
          {
            pid: 248,
            name: 'smss.exe',
            children: [],
          },
        ],
      },
    ],
    dlllist: {
      '248': [{ base: '0x2000', name: 'kernel32.dll' }],
    },
    malfind: [
      { pid: 248, address: '0x401000', description: 'Injected code', protection: 'RWX' },
    ],
    yarascan: [
      {
        pid: 248,
        rule: 'SuspiciousAPIs',
        address: '0x401000',
        heuristic: 'suspicious',
        description: 'Mock heuristic match',
      },
    ],
  };

  return {
    ...base,
    ...overrides,
    segments: overrides.segments ?? base.segments,
    pstree: overrides.pstree ?? base.pstree,
    dlllist: overrides.dlllist ?? base.dlllist,
    malfind: overrides.malfind ?? base.malfind,
    yarascan: overrides.yarascan ?? base.yarascan,
  };
};

export const buildVolatilityPsListFixture = (
  overrides: Partial<VolatilityTableFixture> = {},
): VolatilityTableFixture => {
  const base: VolatilityTableFixture = {
    columns: [
      { key: 'pid', label: 'PID' },
      { key: 'ppid', label: 'PPID' },
      { key: 'name', label: 'Name' },
    ],
    rows: [
      { pid: 4, ppid: 0, name: 'System' },
      { pid: 248, ppid: 4, name: 'smss.exe' },
    ],
  };

  return {
    ...base,
    ...overrides,
    columns: overrides.columns ?? base.columns,
    rows: overrides.rows ?? base.rows,
  };
};

export const buildVolatilityNetscanFixture = (
  overrides: Partial<VolatilityTableFixture> = {},
): VolatilityTableFixture => {
  const base: VolatilityTableFixture = {
    columns: [
      { key: 'proto', label: 'Proto' },
      { key: 'local', label: 'LocalAddr' },
      { key: 'foreign', label: 'ForeignAddr' },
      { key: 'state', label: 'State' },
    ],
    rows: [
      { proto: 'TCP', local: '0.0.0.0:80', foreign: '0.0.0.0:0', state: 'LISTENING' },
      { proto: 'UDP', local: '127.0.0.1:53', foreign: '0.0.0.0:0', state: 'NONE' },
    ],
  };

  return {
    ...base,
    ...overrides,
    columns: overrides.columns ?? base.columns,
    rows: overrides.rows ?? base.rows,
  };
};
