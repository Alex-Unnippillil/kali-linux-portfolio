import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecurityTools from '../components/apps/security-tools';

const mockFetchImplementation = () => {
  const suricataLogs = [{ message: 'Alert: Possible intrusion detected' }];
  const zeekLogs = [{ note: 'Alert raised by Zeek pipeline' }];
  const sigmaRules = [
    { id: 'sigma-1', title: 'Suspicious PowerShell', description: 'Detects suspicious PowerShell usage' },
  ];
  const mitreTactics = {
    tactics: [
      {
        id: 'TA0001',
        name: 'Initial Access',
        techniques: [{ id: 'T1566', name: 'Phishing' }],
      },
    ],
  };
  const yaraSample = 'This MALWARE sample references T1566 phishing indicators.';

  const responseFor = (data: unknown, type: 'json' | 'text' = 'json') =>
    Promise.resolve({
      ok: true,
      json: async () => {
        if (type !== 'json') {
          throw new Error('json() not available');
        }
        return data;
      },
      text: async () => {
        if (type !== 'text') {
          return JSON.stringify(data);
        }
        return data as string;
      },
    });

  return jest.spyOn(global, 'fetch').mockImplementation((url: RequestInfo) => {
    const target = typeof url === 'string' ? url : url.url;

    switch (target) {
      case '/fixtures/suricata.json':
        return responseFor(suricataLogs);
      case '/fixtures/zeek.json':
        return responseFor(zeekLogs);
      case '/fixtures/sigma.json':
        return responseFor(sigmaRules);
      case '/fixtures/mitre.json':
        return responseFor(mitreTactics);
      case '/fixtures/yara_sample.txt':
        return responseFor(yaraSample, 'text');
      default:
        return Promise.reject(new Error(`Unhandled fetch request: ${target}`));
    }
  });
};

describe('SecurityTools search keyboard interactions', () => {
  beforeEach(() => {
    window.localStorage.setItem('security-tools-lab-ok', 'true');
    window.localStorage.setItem('lab-mode', 'true');
  });

  afterEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('cycles highlighted results with arrow keys and updates when query changes', async () => {
    mockFetchImplementation();
    render(<SecurityTools />);

    const user = userEvent.setup();
    const searchInput = await screen.findByPlaceholderText('Search all tools');

    await user.type(searchInput, 'alert');

    let options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveTextContent(/Suricata/i);

    await user.keyboard('{ArrowDown}');
    options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveTextContent(/Zeek/i);

    await user.clear(searchInput);
    await user.type(searchInput, 'T1566');

    options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent(/MITRE ATT&CK/i);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('launches the highlighted tool when pressing Enter', async () => {
    mockFetchImplementation();
    render(<SecurityTools />);

    const user = userEvent.setup();
    const searchInput = await screen.findByPlaceholderText('Search all tools');

    await user.type(searchInput, 'alert');
    await screen.findAllByRole('option');

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(searchInput).toHaveValue('');
    await screen.findByText(/Sample Zeek logs from local JSON fixture/i);
  });
});
