import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import OpenVASApp from '../components/apps/openvas';

describe('OpenVASApp', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve('scan complete'),
        json: () =>
          Promise.resolve({
            tasks: [
              { id: 'task-1', name: 'Weekly Scan', target: '192.168.1.10' },
            ],
            results: [
              {
                host: '192.168.1.10',
                severity: 'High',
                vulnerability: 'CVE-1',
              },
            ],
          }),
      })
    ) as any;

    const notificationMock: any = jest.fn();
    (notificationMock as any).permission = 'granted';
    // @ts-ignore
    global.Notification = notificationMock;

    // @ts-ignore
    global.URL.createObjectURL = jest.fn(() => 'blob:summary');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('includes group in scan request', async () => {
    render(<OpenVASApp />);
    fireEvent.change(
      screen.getByPlaceholderText('Target (e.g. 192.168.1.1)'),
      { target: { value: '1.2.3.4' } }
    );
    fireEvent.change(
      screen.getByPlaceholderText('Group (e.g. Servers)'),
      { target: { value: 'servers' } }
    );
    fireEvent.click(screen.getByText('Scan'));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith(
      '/api/openvas?target=1.2.3.4&group=servers'
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

  it('loads sample report and renders summary', async () => {
    render(<OpenVASApp />);
    fireEvent.click(screen.getByText('Load Sample Report'));
    await waitFor(() =>
      expect(screen.getByText('Weekly Scan')).toBeInTheDocument()
    );
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Download Sample PDF')).toHaveAttribute(
      'href',
      '/apps/openvas/sample-report.pdf'
    );
  });
});
