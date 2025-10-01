import { safeLocalStorage } from './safeStorage';

export type ComplianceStatus =
  | 'not-started'
  | 'in-progress'
  | 'blocked'
  | 'compliant'
  | 'not-applicable';

export interface ComplianceItem {
  id: string;
  title: string;
  description: string;
  owner: string;
  docUrl: string;
}

export interface ComplianceChecklistEntry {
  id: string;
  status: ComplianceStatus;
  note?: string;
  updatedAt?: string;
}

export interface ComplianceChecklistState {
  version: number;
  items: ComplianceChecklistEntry[];
  lastUpdated?: string;
}

export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: 'csp',
    title: 'Content Security Policy',
    description:
      'Confirm the desktop shell and hosted apps enforce the documented CSP and monitor violation reports.',
    owner: 'Platform Security Engineering',
    docUrl: 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/compliance.md#content-security-policy-csp',
  },
  {
    id: 'permissions',
    title: 'Desktop Permissions Governance',
    description:
      'Review requested browser permissions per app and verify least-privilege defaults with revocation paths.',
    owner: 'Application Platform Team',
    docUrl: 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/compliance.md#desktop-permissions-governance',
  },
  {
    id: 'audit-logs',
    title: 'Audit Logging',
    description:
      'Validate that audit events are structured, forwarded to the SIEM, and retained for the full policy window.',
    owner: 'Security Operations Center (SOC)',
    docUrl: 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/compliance.md#audit-logging',
  },
  {
    id: 'telemetry',
    title: 'Telemetry Transparency',
    description:
      'Ensure telemetry opt-outs are honored across analytics providers and new collectors are reviewed.',
    owner: 'Privacy Engineering & Developer Experience',
    docUrl: 'https://github.com/Alex-Unnippillil/kali-linux-portfolio/blob/main/docs/compliance.md#telemetry-transparency',
  },
];

export const COMPLIANCE_STATUS_OPTIONS: { value: ComplianceStatus; label: string }[] = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'not-applicable', label: 'Not applicable' },
];

const STORAGE_KEY = 'compliance-checklist';
const CURRENT_VERSION = 1;

const toEntryMap = (items: ComplianceChecklistEntry[]) =>
  items.reduce<Record<string, ComplianceChecklistEntry>>((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

const getDefaultEntry = (id: string): ComplianceChecklistEntry => ({
  id,
  status: 'not-started',
  note: '',
});

export const getDefaultComplianceChecklist = (): ComplianceChecklistState => ({
  version: CURRENT_VERSION,
  items: COMPLIANCE_ITEMS.map((item) => getDefaultEntry(item.id)),
});

const normalizeChecklist = (
  input?: Partial<ComplianceChecklistState>
): ComplianceChecklistState => {
  const base = getDefaultComplianceChecklist();
  if (!input) return base;

  const existingMap = input.items ? toEntryMap(input.items) : {};
  const mergedItems = COMPLIANCE_ITEMS.map((item) => {
    const stored = existingMap[item.id];
    if (!stored) {
      return getDefaultEntry(item.id);
    }
    return {
      id: item.id,
      status: stored.status ?? 'not-started',
      note: stored.note ?? '',
      updatedAt: stored.updatedAt,
    };
  });

  return {
    version: CURRENT_VERSION,
    items: mergedItems,
    lastUpdated: input.lastUpdated,
  };
};

export const loadComplianceChecklist = (): ComplianceChecklistState => {
  if (!safeLocalStorage) {
    return getDefaultComplianceChecklist();
  }

  const raw = safeLocalStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return getDefaultComplianceChecklist();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ComplianceChecklistState>;
    return normalizeChecklist(parsed);
  } catch (error) {
    console.warn('Failed to parse compliance checklist from storage', error);
    return getDefaultComplianceChecklist();
  }
};

export const saveComplianceChecklist = (state: ComplianceChecklistState) => {
  if (!safeLocalStorage) return;
  const payload: ComplianceChecklistState = {
    ...state,
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
  };
  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const serializeComplianceChecklist = (
  state: ComplianceChecklistState
): string => {
  const payload = {
    version: CURRENT_VERSION,
    exportedAt: new Date().toISOString(),
    items: state.items,
  };
  return JSON.stringify(payload, null, 2);
};

export const deserializeComplianceChecklist = (
  json: string
): ComplianceChecklistState | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    console.error('Invalid compliance checklist JSON', error);
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const candidate = parsed as Partial<ComplianceChecklistState> & {
    exportedAt?: string;
  };

  if (!candidate.items || !Array.isArray(candidate.items)) {
    return null;
  }

  return normalizeChecklist(candidate);
};

export const clearComplianceChecklist = () => {
  if (!safeLocalStorage) return;
  safeLocalStorage.removeItem(STORAGE_KEY);
};

