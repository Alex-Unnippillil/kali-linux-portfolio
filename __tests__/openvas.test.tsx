import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import OpenVASApp from '../components/apps/openvas';

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

  it('sanitizes finding descriptions', async () => {
    const workerInstances: any[] = [];
    class WorkerMock {
      onmessage: any = null;
      postMessage() {}
      terminate() {}
      constructor() {
        workerInstances.push(this);
      }
    }
    (global as any).Worker = WorkerMock as any;
    const { container } = render(<OpenVASApp />);
    const malicious = '<img src=x onerror="alert(1)">';
    await act(async () => {
      workerInstances[0].onmessage({
        data: [
          {
            description: malicious,
            severity: 'low',
            likelihood: 'low',
            impact: 'low',
          },
        ],
      });
    });
    const alertItem = await screen.findByRole('alert');
    expect(alertItem.querySelector('span')?.innerHTML).toBe(
      '&lt;img src=x onerror="alert(1)"&gt;'
    );
    // Cleanup
    // @ts-ignore
    delete global.Worker;
  });
});
