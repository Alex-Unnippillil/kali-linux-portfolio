import React, { useMemo, useState } from 'react';

export type CertificateIdentity = {
  raw: string;
  attributes: Record<string, string>;
  commonName?: string;
  organization?: string;
  organizationalUnit?: string;
  country?: string;
};

export type ParsedCertificate = {
  id: string;
  name: string;
  subject: CertificateIdentity;
  issuer: CertificateIdentity;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  subjectAltNames: string[];
  isCA: boolean;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  pem: string;
  role?: 'leaf' | 'intermediate' | 'root';
};

export type CertificateChain = {
  id: string;
  title: string;
  description: string;
  certificates: ParsedCertificate[];
};

export type CertificateWarningLevel = 'info' | 'warning' | 'error';

export type CertificateWarning = {
  level: CertificateWarningLevel;
  message: string;
  certificateId?: string;
  certificateName?: string;
};

export type ChainValidationResult = {
  chainId: string;
  isValid: boolean;
  checkedAt: string;
  warnings: CertificateWarning[];
};

export type ChainValidationOptions = {
  referenceDate?: Date;
};

export type CertificateBlockMetadata = {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: string;
  notAfter: string;
  subjectAltNames: string[];
  isCA: boolean;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  body?: string;
};

const formatPemBody = (value: string) => {
  const condensed = value.replace(/\s+/g, '');
  const segments = condensed.match(/.{1,64}/g);
  return segments ? segments.join('\n') : condensed;
};

const normaliseSan = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (/^dns:/i.test(trimmed)) {
    return trimmed;
  }
  return `DNS:${trimmed}`;
};

export const createCertificateBlock = (metadata: CertificateBlockMetadata) => {
  const placeholderBody = metadata.body ?? `MIIB${metadata.serialNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'CERT'}FAKECERTDATA`;
  const body = formatPemBody(placeholderBody);
  const sanValues = metadata.subjectAltNames.map(normaliseSan).filter(Boolean);
  const sanLine = sanValues.length ? sanValues.join(', ') : 'none';
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\nSubject: ${metadata.subject}\nIssuer: ${metadata.issuer}\nSerial: ${metadata.serialNumber}\nNot Before: ${metadata.notBefore}\nNot After: ${metadata.notAfter}\nSubject Alternative Names: ${sanLine}\nIs CA: ${metadata.isCA ? 'true' : 'false'}\nSignature Algorithm: ${metadata.signatureAlgorithm}\nPublic Key Algorithm: ${metadata.publicKeyAlgorithm}\n`;
};

const parseLine = (source: string, label: string, required = true) => {
  const regex = new RegExp(`^${label}:\\s*(.+)$`, 'im');
  const match = source.match(regex);
  if (!match) {
    if (!required) {
      return null;
    }
    throw new Error(`Missing ${label} in certificate block`);
  }
  return match[1].trim();
};

export const parseDistinguishedName = (value: string): CertificateIdentity => {
  const attributes: Record<string, string> = {};
  value
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const [key, ...rest] = segment.split('=');
      if (!key || rest.length === 0) {
        return;
      }
      const attrKey = key.trim().toUpperCase();
      const attrValue = rest.join('=').trim();
      if (!attrKey || !attrValue) {
        return;
      }
      attributes[attrKey] = attrValue;
    });

  return {
    raw: value.trim(),
    attributes,
    commonName: attributes.CN,
    organization: attributes.O,
    organizationalUnit: attributes.OU,
    country: attributes.C,
  };
};

const parseSubjectAltNames = (value: string | null) => {
  if (!value || value.toLowerCase() === 'none') {
    return [] as string[];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(/^dns:/i, '').trim())
    .filter(Boolean);
};

const extractPem = (block: string) => {
  const match = block.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
  return match ? match[0].trim() : '';
};

const makeCertificateId = (serialNumber: string, subjectName: string) => {
  return `${serialNumber}:${subjectName}`;
};

export const parseCertificateBlock = (block: string): ParsedCertificate => {
  const subjectLine = parseLine(block, 'Subject');
  const issuerLine = parseLine(block, 'Issuer');
  const serialNumber = parseLine(block, 'Serial');
  const notBefore = parseLine(block, 'Not Before');
  const notAfter = parseLine(block, 'Not After');
  const sanLine = parseLine(block, 'Subject Alternative Names', false);
  const isCALine = parseLine(block, 'Is CA');
  const signatureAlgorithm = parseLine(block, 'Signature Algorithm');
  const publicKeyAlgorithm = parseLine(block, 'Public Key Algorithm');

  const subject = parseDistinguishedName(subjectLine);
  const issuer = parseDistinguishedName(issuerLine);
  const subjectAltNames = parseSubjectAltNames(sanLine);
  const isCA = /^(true|yes|1)$/i.test(isCALine);

  const name = subject.commonName ?? subject.raw;
  const id = makeCertificateId(serialNumber, name);

  return {
    id,
    name,
    subject,
    issuer,
    serialNumber,
    notBefore,
    notAfter,
    subjectAltNames,
    isCA,
    signatureAlgorithm,
    publicKeyAlgorithm,
    pem: extractPem(block),
  };
};

const formatHumanDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
};

const formatHumanDateRange = (start: string, end: string) => {
  const startLabel = formatHumanDate(start);
  const endLabel = formatHumanDate(end);
  return `${startLabel} → ${endLabel} (UTC)`;
};

const differenceInDays = (end: Date, start: Date) => {
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
};

const describeValidity = (certificate: ParsedCertificate, referenceDate: Date) => {
  const start = new Date(certificate.notBefore);
  const end = new Date(certificate.notAfter);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { label: 'Validity unknown', className: 'border-amber-500/40 bg-amber-500/10 text-amber-200' };
  }

  if (referenceDate < start) {
    return {
      label: `Starts ${formatHumanDate(certificate.notBefore)}`,
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    };
  }

  if (referenceDate > end) {
    return {
      label: `Expired ${formatHumanDate(certificate.notAfter)}`,
      className: 'border-red-500/50 bg-red-500/10 text-red-200',
    };
  }

  const daysRemaining = differenceInDays(end, referenceDate);
  if (daysRemaining <= 30) {
    return {
      label: `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    };
  }

  return {
    label: `Expires in ${daysRemaining} days`,
    className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  };
};

const addWarning = (
  warnings: CertificateWarning[],
  level: CertificateWarningLevel,
  message: string,
  certificate?: ParsedCertificate
) => {
  warnings.push({
    level,
    message,
    certificateId: certificate?.id,
    certificateName: certificate?.name,
  });
};

export const validateCertificateChain = (
  chain: CertificateChain,
  options: ChainValidationOptions = {}
): ChainValidationResult => {
  const referenceDate = options.referenceDate ?? new Date();
  const warnings: CertificateWarning[] = [];

  chain.certificates.forEach((certificate, index) => {
    const notBefore = new Date(certificate.notBefore);
    const notAfter = new Date(certificate.notAfter);

    if (Number.isNaN(notBefore.getTime())) {
      addWarning(
        warnings,
        'warning',
        `Certificate "${certificate.name}" has an invalid Not Before date (${certificate.notBefore}).`,
        certificate
      );
    } else if (referenceDate < notBefore) {
      addWarning(
        warnings,
        'error',
        `Certificate "${certificate.name}" is not valid until ${formatHumanDate(certificate.notBefore)}.`,
        certificate
      );
    }

    if (Number.isNaN(notAfter.getTime())) {
      addWarning(
        warnings,
        'warning',
        `Certificate "${certificate.name}" has an invalid Not After date (${certificate.notAfter}).`,
        certificate
      );
    } else if (referenceDate > notAfter) {
      addWarning(
        warnings,
        'error',
        `Certificate "${certificate.name}" expired on ${formatHumanDate(certificate.notAfter)}.`,
        certificate
      );
    }

    if (index === 0) {
      const commonName = certificate.subject.commonName;
      if (commonName) {
        const hasMatchingSAN = certificate.subjectAltNames.some(
          (san) => san.toLowerCase() === commonName.toLowerCase()
        );
        if (!hasMatchingSAN) {
          addWarning(
            warnings,
            'warning',
            `Certificate "${certificate.name}" is missing a Subject Alternative Name entry for its common name (${commonName}).`,
            certificate
          );
        }
      }
    }
  });

  for (let index = 0; index < chain.certificates.length - 1; index += 1) {
    const child = chain.certificates[index];
    const parent = chain.certificates[index + 1];

    if (child.issuer.raw !== parent.subject.raw) {
      addWarning(
        warnings,
        'error',
        `Issuer mismatch: "${child.name}" expects "${child.issuer.raw}" but chain provides "${parent.subject.raw}".`,
        child
      );
    }

    if (!parent.isCA) {
      addWarning(
        warnings,
        'error',
        `Certificate "${parent.name}" must be marked as a Certificate Authority to sign "${child.name}".`,
        parent
      );
    }
  }

  const root = chain.certificates[chain.certificates.length - 1];
  if (root) {
    if (root.issuer.raw !== root.subject.raw) {
      addWarning(
        warnings,
        'error',
        `Root certificate "${root.name}" is issued by "${root.issuer.raw}" instead of being self-signed.`,
        root
      );
    }
    if (!root.isCA) {
      addWarning(
        warnings,
        'error',
        `Root certificate "${root.name}" must be marked as a Certificate Authority to anchor the chain.`,
        root
      );
    }
  }

  return {
    chainId: chain.id,
    warnings,
    isValid: warnings.every((warning) => warning.level !== 'error'),
    checkedAt: referenceDate.toISOString(),
  };
};

const RAW_SAMPLE_CHAIN_DATA = [
  {
    id: 'kali-downloads',
    title: 'Kali Downloads Portal',
    description:
      'A healthy chain that shows a Kali Linux service protected by a valid intermediate and root CA.',
    blocks: [
      createCertificateBlock({
        subject: 'CN=downloads.kali.org, O=Kali Linux Project, C=US',
        issuer: 'CN=Kali Intermediate CA, O=Kali Linux Project, C=US',
        serialNumber: '0x1A2B3C',
        notBefore: '2024-01-01T00:00:00Z',
        notAfter: '2026-01-01T00:00:00Z',
        subjectAltNames: ['DNS:downloads.kali.org', 'DNS:www.kali.org'],
        isCA: false,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (2048 bit)',
      }),
      createCertificateBlock({
        subject: 'CN=Kali Intermediate CA, O=Kali Linux Project, C=US',
        issuer: 'CN=Kali Root CA, O=Kali Linux Project, C=US',
        serialNumber: '0x10CAFE',
        notBefore: '2023-06-01T00:00:00Z',
        notAfter: '2028-06-01T00:00:00Z',
        subjectAltNames: ['DNS:intermediate.kali.org'],
        isCA: true,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (4096 bit)',
      }),
      createCertificateBlock({
        subject: 'CN=Kali Root CA, O=Kali Linux Project, C=US',
        issuer: 'CN=Kali Root CA, O=Kali Linux Project, C=US',
        serialNumber: '0xF00DBA',
        notBefore: '2020-01-01T00:00:00Z',
        notAfter: '2035-01-01T00:00:00Z',
        subjectAltNames: ['DNS:root.kali.org'],
        isCA: true,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (4096 bit)',
      }),
    ],
  },
  {
    id: 'legacy-proxy',
    title: 'Legacy Proxy Appliance',
    description:
      'An intentionally broken example with an expired intermediate, non-CA signer, and non-self-signed root.',
    blocks: [
      createCertificateBlock({
        subject: 'CN=proxy.lab.internal, O=Legacy Lab, C=US',
        issuer: 'CN=Legacy Gateway CA, O=Legacy Lab, C=US',
        serialNumber: '0xDEADBEEF',
        notBefore: '2021-01-01T00:00:00Z',
        notAfter: '2022-01-01T00:00:00Z',
        subjectAltNames: ['DNS:proxy.lab.internal'],
        isCA: false,
        signatureAlgorithm: 'sha1WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (1024 bit)',
      }),
      createCertificateBlock({
        subject: 'CN=Legacy Gateway CA, O=Legacy Lab, C=US',
        issuer: 'CN=Legacy External CA, O=Discontinued Org, C=US',
        serialNumber: '0xABAD1DEA',
        notBefore: '2018-01-01T00:00:00Z',
        notAfter: '2021-05-01T00:00:00Z',
        subjectAltNames: ['DNS:gateway-ca.legacy.local'],
        isCA: false,
        signatureAlgorithm: 'sha1WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (1024 bit)',
      }),
      createCertificateBlock({
        subject: 'CN=Legacy External CA, O=Discontinued Org, C=US',
        issuer: 'CN=Deprecated Signing Authority, O=Discontinued Org, C=US',
        serialNumber: '0xBADC0DE',
        notBefore: '2015-01-01T00:00:00Z',
        notAfter: '2020-01-01T00:00:00Z',
        subjectAltNames: ['DNS:legacy-root.example'],
        isCA: true,
        signatureAlgorithm: 'sha1WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (1024 bit)',
      }),
    ],
  },
  {
    id: 'staging-san',
    title: 'Staging Environment (Missing SAN)',
    description: 'A staging environment certificate missing SAN coverage to illustrate browser warnings.',
    blocks: [
      createCertificateBlock({
        subject: 'CN=staging.internal, O=DevOps Lab, C=US',
        issuer: 'CN=DevOps Intermediate CA, O=DevOps Lab, C=US',
        serialNumber: '0x55AA',
        notBefore: '2024-03-01T00:00:00Z',
        notAfter: '2025-03-01T00:00:00Z',
        subjectAltNames: [],
        isCA: false,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        publicKeyAlgorithm: 'ECDSA P-256',
      }),
      createCertificateBlock({
        subject: 'CN=DevOps Intermediate CA, O=DevOps Lab, C=US',
        issuer: 'CN=DevOps Root CA, O=DevOps Lab, C=US',
        serialNumber: '0xCAFE',
        notBefore: '2023-01-01T00:00:00Z',
        notAfter: '2030-01-01T00:00:00Z',
        subjectAltNames: ['DNS:intermediate.devops.local'],
        isCA: true,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (4096 bit)',
      }),
      createCertificateBlock({
        subject: 'CN=DevOps Root CA, O=DevOps Lab, C=US',
        issuer: 'CN=DevOps Root CA, O=DevOps Lab, C=US',
        serialNumber: '0xFEED',
        notBefore: '2022-01-01T00:00:00Z',
        notAfter: '2037-01-01T00:00:00Z',
        subjectAltNames: ['DNS:devops-root.local'],
        isCA: true,
        signatureAlgorithm: 'sha256WithRSAEncryption',
        publicKeyAlgorithm: 'RSA (4096 bit)',
      }),
    ],
  },
] as const;

export const SAMPLE_CERTIFICATE_CHAINS: CertificateChain[] = RAW_SAMPLE_CHAIN_DATA.map((entry) => ({
  id: entry.id,
  title: entry.title,
  description: entry.description,
  certificates: entry.blocks.map((block, index, all) => {
    const parsed = parseCertificateBlock(block);
    const role: ParsedCertificate['role'] =
      index === 0 ? 'leaf' : index === all.length - 1 ? 'root' : 'intermediate';
    return { ...parsed, role };
  }),
}));

const chainStatusClass = (isValid: boolean) =>
  isValid
    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
    : 'border-red-500/50 bg-red-500/10 text-red-200';

const warningLevelClass: Record<CertificateWarningLevel, string> = {
  error: 'border-red-500/50 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-200',
};

const downloadBlob = (content: string, filename: string, mimeType: string) => {
  if (typeof window === 'undefined') {
    return;
  }
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const chainToJson = (chain: CertificateChain) =>
  JSON.stringify(
    {
      id: chain.id,
      title: chain.title,
      description: chain.description,
      certificates: chain.certificates.map((certificate) => ({
        name: certificate.name,
        subject: certificate.subject.raw,
        issuer: certificate.issuer.raw,
        serialNumber: certificate.serialNumber,
        notBefore: certificate.notBefore,
        notAfter: certificate.notAfter,
        subjectAltNames: certificate.subjectAltNames,
        isCA: certificate.isCA,
        signatureAlgorithm: certificate.signatureAlgorithm,
        publicKeyAlgorithm: certificate.publicKeyAlgorithm,
      })),
    },
    null,
    2
  );

const chainToPemBundle = (chain: CertificateChain) =>
  chain.certificates
    .map((certificate) => certificate.pem)
    .filter(Boolean)
    .join('\n\n');

const CertViewer: React.FC = () => {
  const [selectedChainId, setSelectedChainId] = useState(SAMPLE_CERTIFICATE_CHAINS[0]?.id ?? '');

  const selectedChain = useMemo(() => {
    return (
      SAMPLE_CERTIFICATE_CHAINS.find((chain) => chain.id === selectedChainId) ??
      SAMPLE_CERTIFICATE_CHAINS[0]
    );
  }, [selectedChainId]);

  const validation = useMemo(() => {
    if (!selectedChain) {
      return null;
    }
    return validateCertificateChain(selectedChain);
  }, [selectedChain]);

  if (!selectedChain || !validation) {
    return (
      <div className="rounded border border-gray-800 bg-gray-900/70 p-4 text-sm text-gray-300">
        Unable to load certificate samples.
      </div>
    );
  }

  const referenceDate = new Date(validation.checkedAt);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-semibold text-white">Interactive certificate chains</h3>
        <p className="mt-2 text-sm text-gray-300">
          Select one of the curated chains to inspect how browsers evaluate Subject Alternative Names, validity windows,
          and trust anchors. Use the export controls to download the raw data for your own lab notes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_CERTIFICATE_CHAINS.map((chain) => {
            const isActive = chain.id === selectedChain.id;
            return (
              <button
                key={chain.id}
                type="button"
                onClick={() => setSelectedChainId(chain.id)}
                aria-pressed={isActive}
                className={`rounded border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                  isActive
                    ? 'border-blue-400 bg-blue-500/20 text-blue-100'
                    : 'border-gray-700 bg-gray-900/60 text-gray-300 hover:border-blue-400 hover:text-blue-100'
                }`}
              >
                {chain.title}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            onClick={() => downloadBlob(chainToJson(selectedChain), `${selectedChain.id}.json`, 'application/json')}
            className="rounded border border-gray-700 bg-gray-900/60 px-3 py-2 font-medium text-gray-200 transition hover:border-blue-400 hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => downloadBlob(chainToPemBundle(selectedChain), `${selectedChain.id}.pem`, 'application/x-pem-file')}
            className="rounded border border-gray-700 bg-gray-900/60 px-3 py-2 font-medium text-gray-200 transition hover:border-blue-400 hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Export PEM bundle
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900/70 p-5 shadow-inner">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-white">{selectedChain.title}</h4>
            <p className="mt-1 text-sm text-gray-300">{selectedChain.description}</p>
          </div>
          <span className={`inline-flex items-center rounded px-3 py-1 text-xs font-semibold uppercase ${chainStatusClass(validation.isValid)}`}>
            {validation.isValid ? 'Chain valid' : 'Chain has issues'}
          </span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Checked against {formatHumanDate(validation.checkedAt)} using Kali&apos;s simulated reference clock.
        </p>
        {validation.warnings.length > 0 ? (
          <ul className="mt-4 space-y-3 text-sm">
            {validation.warnings.map((warning, index) => (
              <li
                key={`${warning.certificateId ?? 'chain'}-${index}`}
                className={`rounded border px-3 py-2 ${warningLevelClass[warning.level]}`}
              >
                <span className="font-semibold capitalize">{warning.level}</span>: {warning.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            No warnings detected for this chain. All certificates satisfy the expected policy checks.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-gray-800 bg-gray-900/60 p-5 shadow-inner">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Chain hierarchy</h4>
        <ol className="mt-4 space-y-6 border-l border-blue-900/40 pl-5">
          {selectedChain.certificates.map((certificate) => {
            const validityBadge = describeValidity(certificate, referenceDate);
            return (
              <li key={certificate.id} className="relative">
                <span
                  className="absolute -left-2 top-2 h-3 w-3 rounded-full border border-blue-400 bg-blue-500"
                  aria-hidden="true"
                />
                <div className="rounded border border-gray-800 bg-gray-950/70 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-500/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-100">
                      {certificate.role ? certificate.role : 'certificate'}
                    </span>
                    <span className={`rounded border px-2 py-1 text-[11px] font-medium ${validityBadge.className}`}>
                      {validityBadge.label}
                    </span>
                  </div>
                  <h5 className="mt-2 text-base font-semibold text-white">{certificate.name}</h5>
                  <p className="text-xs text-gray-400">
                    Issued by{' '}
                    <span className="text-gray-200">{certificate.issuer.commonName ?? certificate.issuer.raw}</span>
                  </p>
                  <dl className="mt-3 grid gap-3 text-xs text-gray-300 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-gray-200">Validity</dt>
                      <dd className="mt-1">{formatHumanDateRange(certificate.notBefore, certificate.notAfter)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-200">Serial</dt>
                      <dd className="mt-1 font-mono text-[11px] text-gray-400">{certificate.serialNumber}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-200">Signature</dt>
                      <dd className="mt-1 text-gray-300">{certificate.signatureAlgorithm}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-200">Public key</dt>
                      <dd className="mt-1 text-gray-300">{certificate.publicKeyAlgorithm}</dd>
                    </div>
                  </dl>
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">Subject Alternative Names</p>
                    {certificate.subjectAltNames.length > 0 ? (
                      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                        {certificate.subjectAltNames.map((san) => (
                          <li
                            key={san}
                            className="rounded bg-gray-900 px-2 py-1 font-mono text-[11px] text-gray-200"
                          >
                            {san}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-gray-400">No SAN entries present</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
};

export default CertViewer;
