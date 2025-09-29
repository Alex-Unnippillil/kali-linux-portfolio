export type CommandContext = 'safe' | 'requires-elevation' | 'unsafe-live';

export interface CommandPreset {
  id: string;
  command: string;
  title: string;
  module: string;
  description: string;
  context: CommandContext;
  contextNote: string;
  output: string[];
  icon: string;
}

export const commandPresets: CommandPreset[] = [
  {
    id: 'misc-version',
    command: 'misc::version',
    title: 'Display build information',
    module: 'misc',
    description:
      'Prints the build information for the running mimikatz binary to verify the lab bundle.',
    context: 'safe',
    contextNote: 'Read-only metadata lookup executed against bundled demo data.',
    output: [
      'mimikatz 2.2.0 (x64) #19041 Tue May 01 14:00:00 2024',
      'Module   : misc::version',
      'Mode     : Demo / No live credential access',
    ],
    icon: '📦',
  },
  {
    id: 'crypto-hash',
    command: 'crypto::hash /in:password /alg:NTLM',
    title: 'Derive NTLM hash from sample input',
    module: 'crypto',
    description:
      'Uses the crypto helpers to derive an NTLM hash from a supplied sample password.',
    context: 'safe',
    contextNote: 'Operates on the provided sample string inside the simulator.',
    output: [
      'Algorithm : NTLM',
      'Input     : password',
      'NTLM hash: 8846f7eaee8fb117ad06bdd830b7586c',
      'Token: DEMO-TOKEN-ONLY',
    ],
    icon: '🔐',
  },
  {
    id: 'privilege-debug',
    command: 'privilege::debug',
    title: 'Enable SeDebugPrivilege',
    module: 'privilege',
    description:
      'Attempts to enable the debug privilege so LSASS memory can be accessed.',
    context: 'requires-elevation',
    contextNote:
      'Requires administrative rights and direct token manipulation. Do not run from an untrusted browser.',
    output: [
      '[*] Checking for SeDebugPrivilege',
      '[-] Unable to adjust token in browser demo',
    ],
    icon: '⚙️',
  },
  {
    id: 'sekurlsa-logonpasswords',
    command: 'sekurlsa::logonpasswords',
    title: 'Enumerate logon credentials',
    module: 'sekurlsa',
    description:
      'Parses LSASS memory for logon sessions, hashes, and clear-text credentials.',
    context: 'unsafe-live',
    contextNote:
      'Live LSASS scraping is unsafe in browsers; use offline dumps or isolated labs instead.',
    output: [
      'lsass.exe (1234)',
      'NTLM hash: 5d41402abc4b2a76b9719d911017c592',
      'Ticket cache: user@EXAMPLE.COM',
    ],
    icon: '🧪',
  },
  {
    id: 'lsadump-sam',
    command: 'lsadump::sam',
    title: 'Dump SAM secrets',
    module: 'lsadump',
    description:
      'Reads the SAM and SECURITY hives to extract cached password hashes.',
    context: 'unsafe-live',
    contextNote:
      'Requires raw registry hive access and may destabilize a live host. Prefer offline hive exports.',
    output: [
      'SAM Account: Administrator',
      'Token: 00000000000000000000000000000000',
      'Status: Offline export recommended',
    ],
    icon: '🗝️',
  },
];

export const safeDefaultPreset = commandPresets.find(
  (preset) => preset.context === 'safe',
);
