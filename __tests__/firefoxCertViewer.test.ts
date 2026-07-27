import {
  CertificateChain,
  CertificateWarning,
  createCertificateBlock,
  parseCertificateBlock,
  validateCertificateChain,
} from '../components/apps/firefox/CertViewer';

describe('Firefox certificate viewer helpers', () => {
  it('parses metadata from structured certificate blocks', () => {
    const pem = createCertificateBlock({
      subject: 'CN=example.test, O=Example Org, C=US',
      issuer: 'CN=Example Root, O=Example Org, C=US',
      serialNumber: '0x100',
      notBefore: '2023-01-01T00:00:00Z',
      notAfter: '2024-01-01T00:00:00Z',
      subjectAltNames: ['DNS:example.test', 'DNS:www.example.test'],
      isCA: false,
      signatureAlgorithm: 'sha256WithRSAEncryption',
      publicKeyAlgorithm: 'RSA (2048 bit)',
    });

    const certificate = parseCertificateBlock(pem);

    expect(certificate.subject.commonName).toBe('example.test');
    expect(certificate.issuer.commonName).toBe('Example Root');
    expect(certificate.subjectAltNames).toEqual(['example.test', 'www.example.test']);
    expect(certificate.isCA).toBe(false);
    expect(certificate.serialNumber).toBe('0x100');
    expect(certificate.pem).toContain('-----BEGIN CERTIFICATE-----');
  });

  it('surfaces warnings for expired and untrusted chains', () => {
    const leafPem = createCertificateBlock({
      subject: 'CN=leaf.example, O=Example Org, C=US',
      issuer: 'CN=intermediate.example, O=Example Org, C=US',
      serialNumber: '0x01',
      notBefore: '2020-01-01T00:00:00Z',
      notAfter: '2025-01-01T00:00:00Z',
      subjectAltNames: ['DNS:leaf.example'],
      isCA: false,
      signatureAlgorithm: 'sha256WithRSAEncryption',
      publicKeyAlgorithm: 'RSA (2048 bit)',
    });

    const intermediatePem = createCertificateBlock({
      subject: 'CN=intermediate.example, O=Example Org, C=US',
      issuer: 'CN=root.example, O=Example Org, C=US',
      serialNumber: '0x02',
      notBefore: '2015-01-01T00:00:00Z',
      notAfter: '2020-01-01T00:00:00Z',
      subjectAltNames: ['DNS:intermediate.example'],
      isCA: true,
      signatureAlgorithm: 'sha256WithRSAEncryption',
      publicKeyAlgorithm: 'RSA (4096 bit)',
    });

    const rootPem = createCertificateBlock({
      subject: 'CN=root.example, O=Example Org, C=US',
      issuer: 'CN=external.example, O=Other Org, C=US',
      serialNumber: '0x03',
      notBefore: '2010-01-01T00:00:00Z',
      notAfter: '2030-01-01T00:00:00Z',
      subjectAltNames: ['DNS:root.example'],
      isCA: true,
      signatureAlgorithm: 'sha256WithRSAEncryption',
      publicKeyAlgorithm: 'RSA (4096 bit)',
    });

    const chain: CertificateChain = {
      id: 'test-chain',
      title: 'Test chain',
      description: 'A chain assembled for unit tests',
      certificates: [leafPem, intermediatePem, rootPem].map(parseCertificateBlock),
    };

    const result = validateCertificateChain(chain, {
      referenceDate: new Date('2022-06-01T00:00:00Z'),
    });

    const warningMessages = result.warnings.map((warning: CertificateWarning) => warning.message);

    expect(result.isValid).toBe(false);
    expect(warningMessages.some((message) => message.includes('expired on'))).toBe(true);
    expect(
      warningMessages.some((message) => message.includes('instead of being self-signed'))
    ).toBe(true);
  });
});
