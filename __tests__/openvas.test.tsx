import React from 'react';
import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
  within,
} from '@testing-library/react';
import OpenVASApp from '../components/apps/openvas';

describe('OpenVASApp', () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollTo', {
      value: jest.fn(),
      writable: true,
    });
  });

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
    render(<OpenVASApp />);
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
    render(<OpenVASApp />);
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
    render(<OpenVASApp />);
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
    render(<OpenVASApp />);
    expect(screen.getByText('Policy Settings')).toBeInTheDocument();
    expect(screen.getByText('PCI DSS')).toBeInTheDocument();
  });

  it('allows saving and loading a custom policy', () => {
    render(<OpenVASApp />);
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
    render(<OpenVASApp />);
    fireEvent.click(screen.getByText('Outdated banner exposes software version'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const remediationLabels = screen.getAllByText(/Remediation/);
    expect(remediationLabels.length).toBeGreaterThan(0);
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

    const { unmount } = render(<OpenVASApp />);
    fireEvent.change(
      screen.getByPlaceholderText('Target (e.g. 192.168.1.1)'),
      { target: { value: '1.2.3.4' } }
    );
    fireEvent.click(screen.getByText('Scan'));
    expect(localStorage.getItem('openvas/session')).toBeTruthy();

    unmount();
    render(<OpenVASApp />);

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/openvas?target=1.2.3.4&group=&profile=PCI'
    );

    await act(async () => {
      resolvers.forEach((r) => r());
    });
  });

  it('supports keyboard navigation in findings list', async () => {
    render(<OpenVASApp />);
    const list = screen.getByRole('list', { name: 'Scan findings' });
    const buttons = within(list).getAllByRole('button');
    const firstButton = buttons[0];

    firstButton.focus();
    fireEvent.keyDown(firstButton, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Close'));

    fireEvent.keyDown(firstButton, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(document.activeElement).toBe(buttons[1]);
    });
  });

  it('filters findings by severity without breaking virtualization', () => {
    render(<OpenVASApp />);
    fireEvent.click(screen.getByRole('button', { name: 'High' }));
    return waitFor(() => {
      expect(
        screen.queryByText('Outdated banner exposes software version')
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('Remote code execution vulnerability detected')
      ).toBeInTheDocument();
    });
  });
});
