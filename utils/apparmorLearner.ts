export type ProfileStatus = 'disabled' | 'enabled' | 'complain' | 'enforce';

export interface AppArmorProfile {
  id: string;
  name: string;
  description: string;
  path: string;
  status: ProfileStatus;
}

export interface LearningSuggestion {
  id: string;
  title: string;
  category: 'filesystem' | 'capability' | 'ipc';
  rawLog: string;
  rationale: string;
  ruleLines: string[];
}

export interface LearningSession {
  profileId: string;
  profileName: string;
  executable: string;
  baseProfile: string;
  suggestions: LearningSuggestion[];
}

export interface LearningResult {
  previewProfile: string;
  diff: string;
  appliedSuggestions: LearningSuggestion[];
}

export const profileStatusOptions: ReadonlyArray<{
  key: ProfileStatus;
  label: string;
  helper: string;
}> = [
  {
    key: 'disabled',
    label: 'Disabled',
    helper: 'Profile is unloaded and not enforced.',
  },
  {
    key: 'enabled',
    label: 'Enabled',
    helper: 'Profile is loaded but follows its current mode.',
  },
  {
    key: 'complain',
    label: 'Complain',
    helper: 'Logs violations instead of blocking access.',
  },
  {
    key: 'enforce',
    label: 'Enforce',
    helper: 'Blocks access that is not explicitly allowed.',
  },
];

export const sampleProfiles: ReadonlyArray<AppArmorProfile> = [
  {
    id: 'demo-browser',
    name: 'Demo Browser',
    description: 'Sandboxed web browser that loads user preferences and sends desktop notifications.',
    path: '/usr/bin/demo-browser',
    status: 'enforce',
  },
  {
    id: 'research-notes',
    name: 'Research Notes',
    description: 'Markdown editor storing files in the documents workspace.',
    path: '/opt/tools/research-notes',
    status: 'complain',
  },
  {
    id: 'log-forwarder',
    name: 'Log Forwarder',
    description: 'Service that tails journal entries and forwards summaries to a collector.',
    path: '/usr/local/bin/log-forwarder',
    status: 'enabled',
  },
];

const baseProfile = `# AppArmor profile generated for demonstration purposes\nprofile demo-browser /usr/bin/demo-browser {\n  # Allow essential runtime dependencies\n  /usr/lib/** mr,\n  /etc/ld.so.cache r,\n  /etc/ssl/certs/** r,\n\n  # Basic networking to reach HTTPS endpoints\n  network inet stream,\n}\n`;

const simulatedSuggestions: ReadonlyArray<LearningSuggestion> = [
  {
    id: 'config-read',
    title: 'Allow reading user configuration files',
    category: 'filesystem',
    rawLog:
      'Sep 13 09:14:22 workstation kernel: audit: type=1400 apparmor="DENIED" profile="demo-browser" name="/home/alex/.config/demo-browser/settings.json" requested_mask="r" denied_mask="r"',
    rationale:
      'The browser loads its per-user configuration when booting. Restricting the rule to the user-owned directory keeps confinement tight.',
    ruleLines: ['owner @{HOME}/.config/demo-browser/** rw,'],
  },
  {
    id: 'notifications',
    title: 'Permit desktop notifications over D-Bus',
    category: 'ipc',
    rawLog:
      'Sep 13 09:14:24 workstation dbus-daemon[2213]: apparmor="DENIED" operation="dbus_method_call" bus="session" path="/org/freedesktop/Notifications" interface="org.freedesktop.Notifications" member="Notify" mask="send" name="org.freedesktop.Notifications"',
    rationale:
      'Desktop notifications are part of the browsing experience. Limiting the D-Bus rule to the Notifications interface avoids broad bus access.',
    ruleLines: [
      'dbus send bus=session path=/org/freedesktop/Notifications \\',
      'interface=org.freedesktop.Notifications member=Notify',
    ],
  },
  {
    id: 'download-cache',
    title: 'Write to download cache',
    category: 'filesystem',
    rawLog:
      'Sep 13 09:14:31 workstation kernel: audit: type=1400 apparmor="DENIED" profile="demo-browser" name="/home/alex/Downloads/demo.tmp" requested_mask="w" denied_mask="w"',
    rationale:
      'Temporary downloads should land in the user download directory. Using the @{HOME} variable keeps the rule generic for all users.',
    ruleLines: ['owner @{HOME}/Downloads/** rw,'],
  },
  {
    id: 'certificate-refresh',
    title: 'Allow refreshing certificate store metadata',
    category: 'filesystem',
    rawLog:
      'Sep 13 09:14:37 workstation kernel: audit: type=1400 apparmor="DENIED" profile="demo-browser" name="/var/lib/demo-browser/cert-cache.json" requested_mask="w" denied_mask="w"',
    rationale:
      'The browser maintains its own cached trust store. Restricting writes to the application directory prevents wider filesystem access.',
    ruleLines: ['/var/lib/demo-browser/** rw,'],
  },
  {
    id: 'loopback-capability',
    title: 'Grant bind access to loopback ports',
    category: 'capability',
    rawLog:
      'Sep 13 09:14:40 workstation kernel: audit: type=1400 apparmor="DENIED" profile="demo-browser" pid=4221 comm="demo-browser" capability=36 capname="net_bind_service"',
    rationale:
      'The embedded testing server binds to high loopback ports for WebDriver automation. The capability rule is scoped to the service.',
    ruleLines: ['capability net_bind_service,'],
  },
];

export const sampleLearningSession: LearningSession = {
  profileId: 'demo-browser',
  profileName: 'demo-browser',
  executable: '/usr/bin/demo-browser',
  baseProfile,
  suggestions: simulatedSuggestions,
};

export const getDefaultSelectedSuggestionIds = (
  session: LearningSession = sampleLearningSession
): string[] => session.suggestions.map((suggestion) => suggestion.id);

const buildInsertedLines = (suggestions: LearningSuggestion[]): string[] => {
  const lines: string[] = [];
  suggestions.forEach((suggestion) => {
    lines.push(`  # ${suggestion.title}`);
    suggestion.ruleLines.forEach((rule) => {
      const formatted = rule.startsWith('  ')
        ? rule
        : `  ${rule}`;
      lines.push(formatted);
    });
  });
  return lines;
};

const insertBeforeClosingBrace = (
  base: string,
  insertLines: string[]
): string => {
  if (insertLines.length === 0) {
    return base;
  }
  const lines = base.split('\n');
  const closingIndex = findClosingBraceIndex(lines);
  const before = closingIndex === -1 ? lines : lines.slice(0, closingIndex);
  const after = closingIndex === -1 ? [] : lines.slice(closingIndex);
  const merged = [...before, ...insertLines, ...after];
  return merged.join('\n');
};

const findClosingBraceIndex = (lines: string[]): number => {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (lines[i].trim() === '}') {
      return i;
    }
  }
  return -1;
};

const buildDiff = (
  base: string,
  inserted: string[],
  profileName: string
): string => {
  if (inserted.length === 0) {
    return 'No changes proposed. Select at least one suggestion to build a diff.';
  }

  const baseLines = base.split('\n');
  const closingIndex = findClosingBraceIndex(baseLines);
  const contextStart = closingIndex === -1 ? Math.max(0, baseLines.length - 3) : Math.max(0, closingIndex - 2);
  const context = closingIndex === -1
    ? baseLines.slice(contextStart)
    : baseLines.slice(contextStart, closingIndex);
  const closingLine = closingIndex === -1 ? '}' : baseLines[closingIndex];

  const diffLines: string[] = [
    `--- ${profileName}.base`,
    `+++ ${profileName}.learned`,
    '@@',
    ...context.map((line) => ` ${line}`),
    ...inserted.map((line) => `+${line}`),
    ` ${closingLine}`,
  ];

  return diffLines.join('\n');
};

export const computeLearningResult = (
  session: LearningSession,
  selectedSuggestionIds: string[]
): LearningResult => {
  const selectedSet = new Set(selectedSuggestionIds);
  const appliedSuggestions = session.suggestions.filter((suggestion) =>
    selectedSet.has(suggestion.id)
  );

  if (appliedSuggestions.length === 0) {
    return {
      previewProfile: session.baseProfile,
      diff: 'No changes proposed. Select at least one suggestion to build a diff.',
      appliedSuggestions: [],
    };
  }

  const inserted = buildInsertedLines(appliedSuggestions);
  const previewProfile = insertBeforeClosingBrace(session.baseProfile, inserted);
  const diff = buildDiff(session.baseProfile, inserted, session.profileName);

  return {
    previewProfile,
    diff,
    appliedSuggestions,
  };
};
