export interface MetasploitModule {
  name: string;
  description: string;
  type: 'auxiliary' | 'exploit' | 'post' | string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  platform?: string;
  tags: string[];
  cve?: string[];
  transcript?: string;
  doc?: string;
  options?: Record<string, unknown>;
  teaches?: string;
}

export interface MetasploitLootItem {
  host: string;
  type?: string;
  path?: string;
  data?: string;
}

export interface MetasploitNote {
  host: string;
  note: string;
}

export interface MetasploitLootResponse {
  loot: MetasploitLootItem[];
  notes: MetasploitNote[];
}

const defaultModuleBase: MetasploitModule = {
  name: 'auxiliary/demo/example_module',
  description: 'Demonstration module used for testing.',
  type: 'auxiliary',
  severity: 'medium',
  platform: 'multi',
  tags: ['demo'],
  cve: ['CVE-0000-0000'],
  transcript: '[*] Exploit completed successfully',
  doc: 'Mock documentation for Example Module',
  options: {},
  teaches: 'Highlights builder usage in tests.',
};

export const buildMetasploitModule = (
  overrides: Partial<MetasploitModule> = {},
): MetasploitModule => ({
  ...defaultModuleBase,
  ...overrides,
  tags: overrides.tags ?? defaultModuleBase.tags,
  options: overrides.options ?? defaultModuleBase.options,
});

const defaultLootResponse: MetasploitLootResponse = {
  loot: [
    {
      host: '10.0.0.1',
      type: 'password',
      data: 'demo:demo123',
    },
  ],
  notes: [
    {
      host: '10.0.0.1',
      note: 'Demo credential recovered for walkthroughs.',
    },
  ],
};

export const buildMetasploitLootResponse = (
  overrides: Partial<MetasploitLootResponse> = {},
): MetasploitLootResponse => ({
  ...defaultLootResponse,
  ...overrides,
  loot: overrides.loot ?? defaultLootResponse.loot,
  notes: overrides.notes ?? defaultLootResponse.notes,
});
