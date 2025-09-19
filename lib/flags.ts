const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes', 'enabled']);
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no', 'disabled']);

export interface KillSwitchMetadata {
  reason?: string;
  docLink?: string;
}

export interface FlagDefinition {
  envVar: string;
  defaultValue: boolean;
  killSwitch?: KillSwitchMetadata;
}

export const KILL_SWITCH_IDS = {
  hydra: 'kill-switch.hydra',
  metasploit: 'kill-switch.metasploit',
  metasploitPost: 'kill-switch.msf-post',
  mimikatz: 'kill-switch.mimikatz',
  john: 'kill-switch.john',
  hashcat: 'kill-switch.hashcat',
  ettercap: 'kill-switch.ettercap',
  reaver: 'kill-switch.reaver',
  dsniff: 'kill-switch.dsniff',
  openvas: 'kill-switch.openvas',
  nessus: 'kill-switch.nessus',
  wireshark: 'kill-switch.wireshark',
  kismet: 'kill-switch.kismet',
  beef: 'kill-switch.beef',
} as const;

export type KillSwitchId = (typeof KILL_SWITCH_IDS)[keyof typeof KILL_SWITCH_IDS];

const DOC_BASE =
  'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/kill-switches.md';

const flagRegistry: Record<string, FlagDefinition> = {
  [KILL_SWITCH_IDS.hydra]: {
    envVar: 'NEXT_PUBLIC_KILL_HYDRA',
    defaultValue: false,
    killSwitch: {
      reason: 'Hydra brute-force simulator is paused while credential policies are audited.',
      docLink: `${DOC_BASE}#hydra`,
    },
  },
  [KILL_SWITCH_IDS.metasploit]: {
    envVar: 'NEXT_PUBLIC_KILL_METASPLOIT',
    defaultValue: false,
    killSwitch: {
      reason:
        'Metasploit module browser is offline while exploit catalog updates are reviewed.',
      docLink: `${DOC_BASE}#metasploit`,
    },
  },
  [KILL_SWITCH_IDS.metasploitPost]: {
    envVar: 'NEXT_PUBLIC_KILL_METASPLOIT_POST',
    defaultValue: false,
    killSwitch: {
      reason: 'Metasploit post-exploitation lab is paused during safety content review.',
      docLink: `${DOC_BASE}#metasploit-post`,
    },
  },
  [KILL_SWITCH_IDS.mimikatz]: {
    envVar: 'NEXT_PUBLIC_KILL_MIMIKATZ',
    defaultValue: false,
    killSwitch: {
      reason: 'Credential extraction demo is disabled pending compliance verification.',
      docLink: `${DOC_BASE}#mimikatz`,
    },
  },
  [KILL_SWITCH_IDS.john]: {
    envVar: 'NEXT_PUBLIC_KILL_JOHN',
    defaultValue: false,
    killSwitch: {
      reason: 'Password cracking lab is offline while demo wordlists are refreshed.',
      docLink: `${DOC_BASE}#john-the-ripper`,
    },
  },
  [KILL_SWITCH_IDS.hashcat]: {
    envVar: 'NEXT_PUBLIC_KILL_HASHCAT',
    defaultValue: false,
    killSwitch: {
      reason: 'Hashcat GPU simulation is paused while load tests complete.',
      docLink: `${DOC_BASE}#hashcat`,
    },
  },
  [KILL_SWITCH_IDS.ettercap]: {
    envVar: 'NEXT_PUBLIC_KILL_ETTERCAP',
    defaultValue: false,
    killSwitch: {
      reason: 'Man-in-the-middle lab is disabled while network policies update.',
      docLink: `${DOC_BASE}#ettercap`,
    },
  },
  [KILL_SWITCH_IDS.reaver]: {
    envVar: 'NEXT_PUBLIC_KILL_REAVER',
    defaultValue: false,
    killSwitch: {
      reason: 'WPS attack simulation is offline during compliance validation.',
      docLink: `${DOC_BASE}#reaver`,
    },
  },
  [KILL_SWITCH_IDS.dsniff]: {
    envVar: 'NEXT_PUBLIC_KILL_DNSNIFF',
    defaultValue: false,
    killSwitch: {
      reason: 'Packet sniffing lab is suspended while capture logs are archived.',
      docLink: `${DOC_BASE}#dsniff`,
    },
  },
  [KILL_SWITCH_IDS.openvas]: {
    envVar: 'NEXT_PUBLIC_KILL_OPENVAS',
    defaultValue: false,
    killSwitch: {
      reason: 'OpenVAS simulation is paused while vulnerability feeds update.',
      docLink: `${DOC_BASE}#openvas`,
    },
  },
  [KILL_SWITCH_IDS.nessus]: {
    envVar: 'NEXT_PUBLIC_KILL_NESSUS',
    defaultValue: false,
    killSwitch: {
      reason: 'Nessus dashboard is temporarily offline during plugin refresh.',
      docLink: `${DOC_BASE}#nessus`,
    },
  },
  [KILL_SWITCH_IDS.wireshark]: {
    envVar: 'NEXT_PUBLIC_KILL_WIRESHARK',
    defaultValue: false,
    killSwitch: {
      reason: 'Packet capture sandbox is disabled while trace samples are sanitised.',
      docLink: `${DOC_BASE}#wireshark`,
    },
  },
  [KILL_SWITCH_IDS.kismet]: {
    envVar: 'NEXT_PUBLIC_KILL_KISMET',
    defaultValue: false,
    killSwitch: {
      reason: 'Wireless survey demo is paused while datasets rotate.',
      docLink: `${DOC_BASE}#kismet`,
    },
  },
  [KILL_SWITCH_IDS.beef]: {
    envVar: 'NEXT_PUBLIC_KILL_BEEF',
    defaultValue: false,
    killSwitch: {
      reason:
        'BeEF social engineering sandbox is unavailable while safety scripts are reviewed.',
      docLink: `${DOC_BASE}#beef`,
    },
  },
};

const registry: Readonly<Record<string, FlagDefinition>> = Object.freeze({ ...flagRegistry });

function coerceBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
}

function resolveFlag(definition: FlagDefinition): boolean {
  return coerceBoolean(process.env[definition.envVar], definition.defaultValue);
}

export function getFlagDefinition(id: string): FlagDefinition | undefined {
  return registry[id];
}

export function getFlagValue(id: string): boolean {
  const def = getFlagDefinition(id);
  return def ? resolveFlag(def) : false;
}

export interface KillSwitchInfo extends KillSwitchMetadata {
  active: boolean;
}

export function getKillSwitchInfo(id?: string): KillSwitchInfo {
  if (!id) {
    return { active: false };
  }
  const def = getFlagDefinition(id);
  if (!def?.killSwitch) {
    return { active: false };
  }
  return {
    active: resolveFlag(def),
    reason: def.killSwitch.reason,
    docLink: def.killSwitch.docLink,
  };
}

export const flagRegistrySnapshot = registry;
