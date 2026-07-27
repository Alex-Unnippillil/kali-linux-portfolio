import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import CertificatesApp from '../../../components/apps/certificates';
import {
  resetCertStore,
  getState,
} from '../../../utils/certStore';
import { publish } from '../../../utils/pubsub';

describe('CertificatesApp', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(
      new Date('2025-01-01T00:00:00.000Z').valueOf()
    );
    resetCertStore();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders default certificates and metadata', () => {
    render(<CertificatesApp />);
    expect(screen.getByText('Certificate Store')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kali Root CA/i })).toBeInTheDocument();
    const metadata = screen.getByLabelText(/Certificate metadata/i);
    expect(within(metadata).getByRole('heading', { name: /Metadata/i })).toBeInTheDocument();
    expect(within(metadata).getByText(/2035-12-31/)).toBeInTheDocument();
  });

  it('filters by scope and updates selection', () => {
    render(<CertificatesApp />);
    fireEvent.change(screen.getByLabelText(/Scope/i), { target: { value: 'user' } });
    expect(screen.getByRole('button', { name: /Developer Signing Cert/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kali Root CA/i })).not.toBeInTheDocument();
  });

  it('shows expiry warnings for expiring and expired certificates', () => {
    render(<CertificatesApp />);
    expect(screen.getByText(/Expires in/)).toBeInTheDocument();
    expect(screen.getByText(/Expired/)).toBeInTheDocument();
  });

  it('links TLS issues to the selected certificate and reacts to pubsub events', async () => {
    render(<CertificatesApp />);
    fireEvent.click(screen.getByRole('button', { name: /Lab VPN Gateway/i }));
    expect(
      screen.getByText(/TLS handshake failed: certificate about to expire/i)
    ).toBeInTheDocument();

    const devFingerprint = getState().certificates.find(
      (cert) => cert.label === 'Developer Signing Cert'
    )?.fingerprint;
    expect(devFingerprint).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /Developer Signing Cert/i }));
    expect(
      screen.getByText(/No TLS issues linked to this certificate/i)
    ).toBeInTheDocument();

    act(() => {
      publish('tls:issue', {
        summary: 'Client handshake error',
        severity: 'critical',
        source: 'Wireshark',
        fingerprints: [devFingerprint!],
        detectedAt: '2025-01-01T02:00:00.000Z',
        remediation: 'Renew client certificate',
      });
    });

    expect(
      await screen.findByText(/Client handshake error/i)
    ).toBeInTheDocument();
  });

  it('supports trust and revoke actions', () => {
    render(<CertificatesApp />);
    fireEvent.click(screen.getByRole('button', { name: /Developer Signing Cert/i }));
    const metadata = screen.getByLabelText(/Certificate metadata/i);
    expect(within(metadata).getByText(/Untrusted/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Trust' }));
    });
    expect(within(metadata).getByText(/Trusted/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    });
    expect(within(metadata).getByText(/Revoked/i)).toBeInTheDocument();
  });

  it('imports a certificate and exposes export preview', () => {
    render(<CertificatesApp />);
    const payload = JSON.stringify({
      label: 'QA Service Cert',
      subject: 'CN=qa.lab.internal',
      issuer: 'CN=Kali Issuing CA',
      validFrom: '2025-01-01T00:00:00.000Z',
      validTo: '2025-12-31T00:00:00.000Z',
      type: 'Server',
      usage: ['Server Authentication'],
    });

    act(() => {
      fireEvent.change(screen.getByLabelText(/Import certificate payload/i), {
        target: { value: payload },
      });
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    });

    expect(screen.getByRole('status')).toHaveTextContent('Imported QA Service Cert');
    expect(
      screen.getByRole('button', { name: /QA Service Cert/i })
    ).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /QA Service Cert/i }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    });

    const exportPreview = screen.getByLabelText(/Export preview content/i) as HTMLTextAreaElement;
    expect(exportPreview.value).toContain('"label": "QA Service Cert"');
  });
});
