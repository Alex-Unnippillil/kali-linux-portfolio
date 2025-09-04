import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react';
import OpenVASApp from '../components/apps/openvas';
import NotificationCenter from '../components/common/NotificationCenter';

describe('OpenVASApp', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('scan complete'),
      })
    ) as any;

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
    render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );
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
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      '/api/openvas?target=1.2.3.4&group=servers&profile=HIPAA'
    );
  });

  it('triggers notification on scan completion', async () => {
    render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );
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
    (fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.reject(new Error('fail'))
    );
    render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );
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

  it('displays sample policy settings', () => {
    render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );
    expect(screen.getByText('Policy Settings')).toBeInTheDocument();
    expect(screen.getByText('PCI DSS')).toBeInTheDocument();
  });

  it('allows saving and loading a custom policy', () => {
    render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );
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

  it('opens issue detail panel with remediation info', () => {
    render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );
    fireEvent.click(
      screen.getByText('Outdated banner exposes software version')
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Remediation/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('saves session and resumes pending scan', async () => {
    const resolvers: Function[] = [];
    global.fetch = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvers.push(() =>
            resolve({ ok: true, text: () => Promise.resolve('scan complete') })
          );
        })
    ) as any;

    const { unmount } = render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );
    fireEvent.change(
      screen.getByPlaceholderText('Target (e.g. 192.168.1.1)'),
      { target: { value: '1.2.3.4' } }
    );
    fireEvent.click(screen.getByText('Scan'));
    expect(localStorage.getItem('openvas/session')).toBeTruthy();

    unmount();
    render(
      <NotificationCenter>
        <OpenVASApp />
      </NotificationCenter>
    );

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/openvas?target=1.2.3.4&group=&profile=PCI'
    );

    await act(async () => {
      resolvers.forEach((r) => r());
    });
  });
});
