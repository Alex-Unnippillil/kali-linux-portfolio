import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import OpenVASApp from '../components/apps/openvas';
import fixture from '../public/fixtures/openvas-report.json';

describe('OpenVASApp', () => {
  const defaultFetchImpl = (input: any) => {
    if (typeof input === 'string' && input.includes('/fixtures/openvas-report.json')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(fixture),
      });
    }
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve('scan complete'),
    });
  };

  const enableLabMode = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }));
    await screen.findByText('OpenVAS Scanner');
  };

  const renderWithLab = async () => {
    render(<OpenVASApp />);
    await enableLabMode();
  };

  beforeEach(() => {
    global.fetch = jest.fn(defaultFetchImpl) as any;

    const notificationMock: any = jest.fn();
    (notificationMock as any).permission = 'granted';
    // @ts-ignore
    global.Notification = notificationMock;

    // @ts-ignore
    global.URL.createObjectURL = jest.fn(() => 'blob:summary');
    localStorage.clear();
  });

  afterEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  it('includes group and profile in scan request', async () => {
    await renderWithLab();
    fireEvent.change(
      screen.getByPlaceholderText('Target (e.g. 192.168.1.1)'),
      { target: { value: '1.2.3.4' } }
    );
    fireEvent.change(
      screen.getByPlaceholderText('Group (e.g. Servers)'),
      { target: { value: 'servers' } }
    );
    fireEvent.click(screen.getByRole('tab', { name: 'HIPAA' }));
    fireEvent.click(screen.getByText('Scan'));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/openvas?target=1.2.3.4&group=servers&profile=HIPAA'
      )
    );
  });

  it('triggers notification on scan completion', async () => {
    await renderWithLab();
    fireEvent.change(
      screen.getByPlaceholderText('Target (e.g. 192.168.1.1)'),
      { target: { value: '1.2.3.4' } }
    );
    fireEvent.click(screen.getByText('Scan'));
    await waitFor(() =>
      expect(Notification).toHaveBeenCalledWith('OpenVAS Scan Complete', {
        body: expect.any(String),
      })
    );
  });

  it('triggers notification on scan failure', async () => {
    (fetch as jest.Mock).mockImplementation((input: any) => {
      if (typeof input === 'string' && input.includes('/fixtures/openvas-report.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fixture),
        });
      }
      return Promise.reject(new Error('fail'));
    });

    render(<OpenVASApp />);
    await enableLabMode();
    fireEvent.change(
      screen.getByPlaceholderText('Target (e.g. 192.168.1.1)'),
      { target: { value: '1.2.3.4' } }
    );
    fireEvent.click(screen.getByText('Scan'));
    await waitFor(() =>
      expect(Notification).toHaveBeenCalledWith('OpenVAS Scan Failed', {
        body: 'fail',
      })
    );
  });

  it('displays sample policy settings', async () => {
    await renderWithLab();
    expect(screen.getByText('Policy Settings')).toBeInTheDocument();
    expect(screen.getByText('PCI DSS')).toBeInTheDocument();
  });

  it('allows saving and loading a custom policy', async () => {
    await renderWithLab();
    fireEvent.change(screen.getByLabelText('Policy Name'), {
      target: { value: 'Custom Policy' },
    });
    fireEvent.click(screen.getByText('Save Policy'));
    fireEvent.change(screen.getByLabelText('Policy Name'), {
      target: { value: 'Modified' },
    });
    fireEvent.click(screen.getByText('Load Policy'));
    expect(screen.getByLabelText('Policy Name')).toHaveValue('Custom Policy');
  });

  it('opens issue detail panel with remediation info', async () => {
    await renderWithLab();
    const vulnTitle = fixture.hosts[0].vulns[0].title;
    fireEvent.click(screen.getByRole('button', { name: new RegExp(vulnTitle, 'i') }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Remediation/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates between summary and detail views', async () => {
    await renderWithLab();
    expect(screen.getByText('Severity overview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Host detail' }));
    await screen.findByText('Hosts');
    fireEvent.click(screen.getByRole('button', { name: /192\.168\.1\.10/ }));
    expect(screen.getByText('Observed services')).toBeInTheDocument();
    expect(screen.getByText(/Apache HTTP Server 2\.4\.49 • 443\/tcp/)).toBeInTheDocument();
  });

  it('shows offline fallback warning when fixtures fail', async () => {
    (fetch as jest.Mock).mockImplementation((input: any) => {
      if (typeof input === 'string' && input.includes('/fixtures/openvas-report.json')) {
        return Promise.reject(new Error('offline'));
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('scan complete'),
      });
    });

    render(<OpenVASApp />);
    await enableLabMode();
    expect(
      await screen.findByText(/Offline fallback active\. Falling back to bundled offline data\./)
    ).toBeInTheDocument();
  });

  it('saves session and resumes pending scan', async () => {
    const resolvers: Function[] = [];
    (global.fetch as jest.Mock).mockImplementation((input: any) => {
      if (typeof input === 'string' && input.includes('/fixtures/openvas-report.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(fixture),
        });
      }
      return new Promise((resolve) => {
        resolvers.push(() =>
          resolve({ ok: true, text: () => Promise.resolve('scan complete') })
        );
      });
    });

    const { unmount } = render(<OpenVASApp />);
    await enableLabMode();
    fireEvent.change(
      screen.getByPlaceholderText('Target (e.g. 192.168.1.1)'),
      { target: { value: '1.2.3.4' } }
    );
    fireEvent.click(screen.getByText('Scan'));
    expect(localStorage.getItem('openvas/session')).toBeTruthy();

    unmount();
    render(<OpenVASApp />);
    await screen.findByText('OpenVAS Scanner');

    await waitFor(() =>
      expect(
        (fetch as jest.Mock).mock.calls.filter(
          ([url]) => typeof url === 'string' && url.startsWith('/api/openvas')
        ).length
      ).toBeGreaterThanOrEqual(2)
    );

    const apiCalls = (fetch as jest.Mock).mock.calls.filter(
      ([url]) => typeof url === 'string' && url.startsWith('/api/openvas')
    );
    expect(apiCalls[apiCalls.length - 1][0]).toBe(
      '/api/openvas?target=1.2.3.4&group=&profile=PCI'
    );

    await act(async () => {
      resolvers.forEach((r) => r());
    });
  });
});
