import { useSyncExternalStore } from 'react';
import { subscribe as subscribeToPubsub } from './pubsub';

export type CertificateScope = 'system' | 'user';
export type CertificateType = 'CA' | 'Server' | 'Client' | 'Code Signing';
export type CertificateStatus = 'trusted' | 'untrusted' | 'revoked';
export type TlsSeverity = 'info' | 'warning' | 'critical';

export interface Certificate {
  id: string;
  label: string;
  scope: CertificateScope;
  type: CertificateType;
  issuer: string;
  subject: string;
  serialNumber: string;
  fingerprint: string;
  validFrom: string;
  validTo: string;
  usage: string[];
  algorithm: string;
  trusted: boolean;
  revoked: boolean;
  metadata: Record<string, string>;
  notes?: string;
}

export interface TlsIssue {
  id: string;
  source: string;
  summary: string;
  details?: string;
  severity: TlsSeverity;
  detectedAt: string;
  fingerprints: string[];
  remediation?: string;
}

export interface ImportCertificatePayload {
  label: string;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  type: CertificateType;
  usage: string[];
  algorithm?: string;
  fingerprint?: string;
  serialNumber?: string;
  scope?: CertificateScope;
  metadata?: Record<string, string>;
  trusted?: boolean;
}

export interface CertStoreState {
  certificates: Certificate[];
  tlsIssues: TlsIssue[];
}

type Listener = () => void;

type TlsIssuePayload = Partial<Omit<TlsIssue, 'id' | 'detectedAt' | 'fingerprints'>> & {
  id?: string;
  detectedAt?: string | number | Date;
  fingerprints: string[];
};

const TLS_TOPIC = 'tls:issue';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const initialCertificates: Certificate[] = [
  {
    id: 'root-ca',
    label: 'Kali Root CA',
    scope: 'system',
    type: 'CA',
    issuer: 'CN=Kali Root Authority, O=Kali Lab, C=CA',
    subject: 'CN=Kali Root Authority, O=Kali Lab, C=CA',
    serialNumber: '01',
    fingerprint: 'AA:11:00:AA:11:00:AA:11:00:AA:11:00:AA:11:00:AA:11:00:AA:11:00:AA:11:00',
    validFrom: '2020-01-01T00:00:00.000Z',
    validTo: '2035-12-31T23:59:59.000Z',
    usage: ['Certificate Signing', 'CRL Signing'],
    algorithm: 'RSA-4096',
    trusted: true,
    revoked: false,
    metadata: {
      subjectAltName: 'DNS:root-ca.kali.lan',
      keyUsage: 'Digital Signature, Certificate Sign, CRL Sign',
      extendedKeyUsage: 'N/A',
    },
  },
  {
    id: 'vpn-gateway',
    label: 'Lab VPN Gateway',
    scope: 'system',
    type: 'Server',
    issuer: 'CN=Kali Root Authority, O=Kali Lab, C=CA',
    subject: 'CN=vpn.lab.internal, O=Kali Lab',
    serialNumber: '02',
    fingerprint: 'BB:22:11:BB:22:11:BB:22:11:BB:22:11:BB:22:11:BB:22:11:BB:22:11:BB:22:11',
    validFrom: '2024-01-01T00:00:00.000Z',
    validTo: '2025-01-20T00:00:00.000Z',
    usage: ['Server Authentication', 'Key Encipherment'],
    algorithm: 'ECDSA-P256',
    trusted: true,
    revoked: false,
    metadata: {
      subjectAltName: 'DNS:vpn.lab.internal, DNS:vpn.lab',
      keyUsage: 'Digital Signature, Key Encipherment',
      extendedKeyUsage: 'TLS Web Server Authentication',
    },
  },
  {
    id: 'legacy-proxy',
    label: 'Legacy Proxy Certificate',
    scope: 'system',
    type: 'Server',
    issuer: 'CN=Legacy Signing Authority, O=Retired Systems, C=US',
    subject: 'CN=proxy.legacy.local, O=Retired Systems',
    serialNumber: '0F',
    fingerprint: 'CC:33:22:CC:33:22:CC:33:22:CC:33:22:CC:33:22:CC:33:22:CC:33:22:CC:33:22',
    validFrom: '2018-03-01T00:00:00.000Z',
    validTo: '2024-04-01T00:00:00.000Z',
    usage: ['Server Authentication'],
    algorithm: 'RSA-2048',
    trusted: false,
    revoked: true,
    metadata: {
      subjectAltName: 'DNS:proxy.legacy.local',
      keyUsage: 'Digital Signature, Key Encipherment',
      extendedKeyUsage: 'TLS Web Server Authentication',
    },
    notes: 'Legacy proxy decommissioned; certificate revoked.',
  },
  {
    id: 'dev-signing',
    label: 'Developer Signing Cert',
    scope: 'user',
    type: 'Code Signing',
    issuer: 'CN=Kali Issuing CA, O=Kali Lab, C=CA',
    subject: 'CN=Alex Dev, OU=Engineering, O=Kali Lab',
    serialNumber: 'AC1D3V',
    fingerprint: 'DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33:DD:44:33',
    validFrom: '2024-06-15T00:00:00.000Z',
    validTo: '2026-06-15T00:00:00.000Z',
    usage: ['Code Signing', 'Digital Signature'],
    algorithm: 'RSA-3072',
    trusted: false,
    revoked: false,
    metadata: {
      subjectAltName: 'email:alex@lab.internal',
      keyUsage: 'Digital Signature, Non Repudiation',
      extendedKeyUsage: 'Code Signing',
    },
  },
];

const initialIssues: TlsIssue[] = [
  {
    id: 'issue-vpn-handshake',
    source: 'Nmap NSE',
    summary: 'TLS handshake failed: certificate about to expire',
    details:
      'TLS enumeration scripts flagged vpn.lab.internal due to a certificate expiring soon. Renew before users are locked out.',
    severity: 'warning',
    detectedAt: '2024-12-30T12:00:00.000Z',
    fingerprints: [initialCertificates[1].fingerprint],
    remediation: 'Generate new server certificate from Kali Root Authority and redeploy.',
  },
  {
    id: 'issue-legacy-expired',
    source: 'Nessus',
    summary: 'Expired TLS certificate served by proxy.legacy.local',
    details:
      'Historical scans show the legacy proxy serving an expired certificate. Confirm service is offline.',
    severity: 'critical',
    detectedAt: '2024-05-02T09:30:00.000Z',
    fingerprints: [initialCertificates[2].fingerprint],
    remediation: 'Remove legacy proxy entries from load balancer and revoke certificate.',
  },
];

let state: CertStoreState = {
  certificates: initialCertificates.map(cloneCertificate),
  tlsIssues: initialIssues.map(cloneIssue),
};

const listeners = new Set<Listener>();

function cloneCertificate(cert: Certificate): Certificate {
  return {
    ...cert,
    usage: [...cert.usage],
    metadata: { ...cert.metadata },
  };
}

function cloneIssue(issue: TlsIssue): TlsIssue {
  return {
    ...issue,
    fingerprints: [...issue.fingerprints],
  };
}

function createSnapshot(): CertStoreState {
  return {
    certificates: state.certificates.map(cloneCertificate),
    tlsIssues: state.tlsIssues.map(cloneIssue),
  };
}

let snapshotCache: CertStoreState = createSnapshot();

function recomputeSnapshot(): void {
  snapshotCache = createSnapshot();
}

function emit(): void {
  recomputeSnapshot();
  listeners.forEach((listener) => listener());
}

function snapshot(): CertStoreState {
  return snapshotCache;
}

function ensureFingerprintUnique(fingerprint: string): string {
  let candidate = fingerprint.toUpperCase();
  const existing = new Set(state.certificates.map((c) => c.fingerprint));
  while (existing.has(candidate)) {
    candidate = generateFingerprint();
  }
  return candidate;
}

function generateFingerprint(): string {
  const parts = Array.from({ length: 20 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase()
  );
  return parts.join(':');
}

function generateSerialNumber(): string {
  return Math.floor(Date.now() + Math.random() * ONE_DAY_MS)
    .toString(16)
    .toUpperCase();
}

function normalizeIssuePayload(payload: TlsIssuePayload): TlsIssue {
  const detectedAt =
    payload.detectedAt instanceof Date
      ? payload.detectedAt.toISOString()
      : typeof payload.detectedAt === 'number'
        ? new Date(payload.detectedAt).toISOString()
        : payload.detectedAt || new Date().toISOString();

  return {
    id: payload.id || `tls-issue-${Date.now()}`,
    source: payload.source || 'Unknown',
    summary: payload.summary || 'Unspecified TLS issue',
    details: payload.details,
    severity: payload.severity || 'warning',
    detectedAt,
    fingerprints: payload.fingerprints.length ? payload.fingerprints : [],
    remediation: payload.remediation,
  };
}

function updateIssueLinks(issue: TlsIssue): void {
  if (!issue.fingerprints.length) return;
  const knownFingerprints = new Set(state.certificates.map((c) => c.fingerprint));
  issue.fingerprints = issue.fingerprints.filter((fp) => knownFingerprints.has(fp));
}

export function getState(): CertStoreState {
  return createSnapshot();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCertStore(): CertStoreState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function getStatus(cert: Certificate): CertificateStatus {
  if (cert.revoked) return 'revoked';
  if (cert.trusted) return 'trusted';
  return 'untrusted';
}

export function trustCertificate(fingerprint: string): void {
  const cert = state.certificates.find((c) => c.fingerprint === fingerprint);
  if (!cert) return;
  cert.trusted = true;
  cert.revoked = false;
  emit();
}

export function revokeCertificate(fingerprint: string): void {
  const cert = state.certificates.find((c) => c.fingerprint === fingerprint);
  if (!cert) return;
  cert.revoked = true;
  cert.trusted = false;
  emit();
}

export function removeCertificate(fingerprint: string): void {
  const index = state.certificates.findIndex((c) => c.fingerprint === fingerprint);
  if (index === -1) return;
  state.certificates.splice(index, 1);
  state.tlsIssues = state.tlsIssues.map((issue) => ({
    ...issue,
    fingerprints: issue.fingerprints.filter((fp) => fp !== fingerprint),
  }));
  emit();
}

export function importCertificate(
  payload: string | ImportCertificatePayload
): Certificate {
  let parsed: ImportCertificatePayload;
  if (typeof payload === 'string') {
    try {
      parsed = JSON.parse(payload) as ImportCertificatePayload;
    } catch (err) {
      throw new Error('Certificate import expects JSON payload.');
    }
  } else {
    parsed = payload;
  }

  if (!parsed || !parsed.label || !parsed.subject || !parsed.issuer) {
    throw new Error('Certificate payload missing required fields.');
  }

  const fingerprint = ensureFingerprintUnique(
    parsed.fingerprint || generateFingerprint()
  );

  const cert: Certificate = {
    id: parsed.serialNumber || fingerprint,
    label: parsed.label,
    scope: parsed.scope || 'user',
    type: parsed.type,
    issuer: parsed.issuer,
    subject: parsed.subject,
    serialNumber: parsed.serialNumber || generateSerialNumber(),
    fingerprint,
    validFrom: parsed.validFrom,
    validTo: parsed.validTo,
    usage: [...parsed.usage],
    algorithm: parsed.algorithm || 'RSA-2048',
    trusted: parsed.trusted ?? false,
    revoked: false,
    metadata: {
      ...(parsed.metadata || {}),
    },
  };

  state.certificates.push(cert);
  emit();
  return cloneCertificate(cert);
}

export function exportCertificate(fingerprint: string): string | null {
  const cert = state.certificates.find((c) => c.fingerprint === fingerprint);
  if (!cert) return null;
  const payload = {
    label: cert.label,
    issuer: cert.issuer,
    subject: cert.subject,
    serialNumber: cert.serialNumber,
    fingerprint: cert.fingerprint,
    validFrom: cert.validFrom,
    validTo: cert.validTo,
    usage: cert.usage,
    algorithm: cert.algorithm,
    scope: cert.scope,
    trusted: cert.trusted,
    revoked: cert.revoked,
    metadata: cert.metadata,
  };
  return JSON.stringify(payload, null, 2);
}

export function recordTlsIssue(payload: TlsIssuePayload): TlsIssue {
  const issue = normalizeIssuePayload(payload);
  updateIssueLinks(issue);

  const existingIndex = state.tlsIssues.findIndex((i) => i.id === issue.id);
  if (existingIndex >= 0) {
    state.tlsIssues[existingIndex] = issue;
  } else {
    state.tlsIssues = [issue, ...state.tlsIssues];
  }
  emit();
  return cloneIssue(issue);
}

export function dismissTlsIssue(issueId: string): void {
  const before = state.tlsIssues.length;
  state.tlsIssues = state.tlsIssues.filter((issue) => issue.id !== issueId);
  if (state.tlsIssues.length !== before) {
    emit();
  }
}

export function resetCertStore(): void {
  state = {
    certificates: initialCertificates.map(cloneCertificate),
    tlsIssues: initialIssues.map(cloneIssue),
  };
  emit();
}

subscribeToPubsub(TLS_TOPIC, (data) => {
  if (!data || typeof data !== 'object') return;
  const payload = data as TlsIssuePayload;
  if (!Array.isArray(payload.fingerprints)) return;
  recordTlsIssue(payload);
});

const certStore = {
  getState,
  useCertStore,
  trustCertificate,
  revokeCertificate,
  removeCertificate,
  importCertificate,
  exportCertificate,
  recordTlsIssue,
  dismissTlsIssue,
  resetCertStore,
};

export default certStore;
