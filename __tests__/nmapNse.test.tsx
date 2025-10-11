import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse';

const mockFixtures = {
  scripts: {
    discovery: [
      {
        name: 'http-title',
        description: 'Fetches page titles from HTTP services.',
        example: 'PORT   STATE SERVICE\n80/tcp open  http\n| http-title: Example Domain\n|_Requested resource was /',
        categories: ['discovery', 'http'],
        phases: ['portrule'],
      },
      {
        name: 'ftp-anon',
        description: 'Checks for anonymous FTP access.',
        example:
          'PORT   STATE SERVICE\n21/tcp open  ftp\n| ftp-anon: Anonymous FTP login allowed (FTP code 230)\n|_-rw-r--r--   1 ftp      ftp        0 Jan 01 00:00 readme.txt',
        categories: ['safe', 'ftp'],
        phases: ['portrule'],
      },
    ],
  },
  outputs: {
    'http-title':
      'PORT   STATE SERVICE\n80/tcp open  http\n| http-title: Example Domain\n|_Requested resource was /',
    'ftp-anon':
      'PORT   STATE SERVICE\n21/tcp open  ftp\n| ftp-anon: Anonymous FTP login allowed (FTP code 230)\n|_-rw-r--r--   1 ftp      ftp        0 Jan 01 00:00 readme.txt',
  },
  results: {
    hosts: [
      {
        ip: '192.0.2.10',
        ports: [
          {
            port: 80,
            service: 'http',
            cvss: 5,
            scripts: [
              { name: 'http-title', output: 'Example Domain' },
            ],
          },
        ],
      },
    ],
  },
};

const setupFetchMock = (overrides?: Partial<typeof mockFixtures>) => {
  const { scripts, outputs, results } = { ...mockFixtures, ...overrides };
  return jest.spyOn(global, 'fetch').mockImplementation((url: RequestInfo | URL) => {
    const href = typeof url === 'string' ? url : url.toString();
    if (href.includes('scripts.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(scripts) } as Response);
    }
    if (href.includes('nmap-nse.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(outputs) } as Response);
    }
    if (href.includes('nmap-results.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(results) } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
};

const enableLab = async () => {
  const button = await screen.findByRole('button', { name: /enable/i });
  await userEvent.click(button);
};

describe('NmapNSEApp', () => {
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows example output for selected script', async () => {
    const mockFetch = setupFetchMock();
    render(<NmapNSEApp />);
    await enableLab();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText(/ftp-anon/i));
    const ftpSection = await screen.findByRole('heading', { name: /ftp-anon/i });
    expect(
      within(ftpSection.parentElement as HTMLElement).getByText(
        /anonymous ftp login allowed/i
      )
    ).toBeInTheDocument();
  });

  it('copies command to clipboard', async () => {
    const mockFetch = setupFetchMock();
    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await enableLab();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /copy command/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('nmap'));
  });

  it('copies example output to clipboard', async () => {
    const mockFetch = setupFetchMock({ outputs: { 'http-title': 'Sample output' } });
    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await enableLab();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /copy output/i }));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Sample output')
    );
    expect(await screen.findByText(/output copied/i)).toBeInTheDocument();
  });

  it('renders script results with category badges', async () => {
    const mockFetch = setupFetchMock();

    render(<NmapNSEApp />);
    await enableLab();
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const hostNode = await screen.findByText('192.0.2.10');
    const scriptNode = within(hostNode.parentElement as HTMLElement).getByText('http-title');
    expect(within(scriptNode.parentElement as HTMLElement).getByText('discovery')).toBeInTheDocument();
  });
});
