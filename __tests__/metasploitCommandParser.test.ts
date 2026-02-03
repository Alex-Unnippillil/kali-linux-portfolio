import {
  defaultMetasploitState,
  parseMetasploitCommand,
} from '../components/apps/metasploit/commandParser';

const demoModules = [
  {
    name: 'auxiliary/scanner/smb/smb_version',
    description: 'Detect SMB versions on target hosts.',
    severity: 'low',
    type: 'auxiliary',
    platform: 'multi',
    cve: [],
    tags: ['smb', 'scanner'],
    transcript: '[*] SMB version check complete (demo).',
    options: {
      RHOSTS: {
        desc: 'Target address range',
        default: '192.168.0.10',
        required: true,
      },
    },
    doc: 'SMB Version Scanner',
    disclosure_date: '2020-01-01',
    teaches: 'Service identification',
  },
];

describe('parseMetasploitCommand', () => {
  it('returns search results for demo queries', () => {
    const { output } = parseMetasploitCommand(
      'search smb',
      demoModules,
      defaultMetasploitState
    );

    expect(output).toContain('auxiliary/scanner/smb/smb_version');
  });

  it('allows selecting a module and showing options', () => {
    const { nextState } = parseMetasploitCommand(
      'use auxiliary/scanner/smb/smb_version',
      demoModules,
      defaultMetasploitState
    );

    const { output } = parseMetasploitCommand(
      'show options',
      demoModules,
      nextState
    );

    expect(output).toContain('RHOSTS');
  });

  it('runs demo output for selected modules', () => {
    const { nextState: selectedState } = parseMetasploitCommand(
      'use auxiliary/scanner/smb/smb_version',
      demoModules,
      defaultMetasploitState
    );
    const { nextState: configuredState } = parseMetasploitCommand(
      'set RHOSTS 10.0.0.5',
      demoModules,
      selectedState
    );

    const { output } = parseMetasploitCommand(
      'run',
      demoModules,
      configuredState
    );

    expect(output).toContain('Running');
    expect(output).toContain('SMB version check complete');
  });
});
