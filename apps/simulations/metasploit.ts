export interface MetasploitCommandResult {
  output: string;
}

export interface MetasploitStoryboardStep {
  title: string;
  command: string;
  description: string;
  takeaway: string;
}

const cannedResponses: Array<{
  match: RegExp;
  response: (matches: RegExpExecArray) => string;
}> = [
  {
    match: /^search\s+(.+)/i,
    response: (m) => `[*] Searching modules for: ${m[1]}\n[*] 3 modules matched in the demo database.\n    auxiliary/scanner/http/title\n    exploit/multi/http/manage_engine_opmanager_auth_upload\n    post/multi/gather/aws_keys`,
  },
  {
    match: /^use\s+(.+)/i,
    response: (m) => `[*] Using module: ${m[1]}\n[*] Info: Simulated module selected for tabletop exercise.`,
  },
  {
    match: /^set\s+([A-Z_]+)\s+(.+)/i,
    response: (m) => `[*] ${m[1]} => ${m[2]} (simulation only)`,
  },
  {
    match: /^run(?:\s+|$)/i,
    response: () => `[*] Running module...\n[*] Demo target responded with mock vulnerability banner.\n[*] No sessions created because this is a teaching environment.`,
  },
  {
    match: /^sessions\s+-i\s*(\d+)/i,
    response: (m) => `[*] Interacting with session ${m[1]}\n[*] Session output: whoami -> demo\\analyst`,
  },
  {
    match: /^help/i,
    response: () => `Core help topics:\n  - search <term>\n  - use <module>\n  - set RHOSTS <target>\n  - run\nAll commands are intercepted and answered locally.`,
  },
];

const defaultBanner = `No canned response matched that command. Describe what would happen next to keep the demo engaging.`;

export const runMetasploitCommand = async (
  command: string
): Promise<MetasploitCommandResult> => {
  const trimmed = command.trim();
  for (const canned of cannedResponses) {
    const matches = canned.match.exec(trimmed);
    if (matches) {
      return { output: canned.response(matches) };
    }
  }
  return { output: defaultBanner };
};

export const metasploitStoryboard: MetasploitStoryboardStep[] = [
  {
    title: 'Recon and module search',
    command: 'search struts',
    description:
      'Highlight how an operator narrows down modules that match a CVE or service fingerprint. The simulated response lists staged modules.',
    takeaway:
      'Emphasise responsible disclosure and change management before launching code.',
  },
  {
    title: 'Configure safely',
    command: 'set RHOSTS 192.0.2.42',
    description:
      'Demonstrate setting options without contacting the remote host. Pair it with documentation on why those values were chosen.',
    takeaway:
      'Keep a written record of every option changed for audit trails.',
  },
  {
    title: 'Tabletop execution',
    command: 'run',
    description:
      'Walk stakeholders through the expected console output. The canned text shows a vulnerability banner without opening a real session.',
    takeaway:
      'Discuss remediation steps immediately rather than attempting exploitation.',
  },
];

export default {
  runMetasploitCommand,
  metasploitStoryboard,
};
