import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SecurityTools from '../components/apps/security-tools';

const createFetchMock = () => {
  const jsonFixtures = {
    '/fixtures/suricata.json': [{ id: 1, alert: 'Exploit attempt detected' }],
    '/fixtures/zeek.json': [{ uid: 'C1', service: 'http' }],
    '/fixtures/sigma.json': [{ id: 'sigma-1', title: 'Suspicious Login' }],
    '/fixtures/mitre.json': {
      tactics: [
        {
          id: 'TA0001',
          name: 'Initial Access',
          techniques: [{ id: 'T1190', name: 'Exploit Public-Facing Application' }],
        },
      ],
    },
  };

  return jest.fn((url: string) => {
    if (url === '/fixtures/yara_sample.txt') {
      return Promise.resolve({
        text: () => Promise.resolve('MALWARE signature present in sample file'),
      } as Response);
    }

    const payload = jsonFixtures[url as keyof typeof jsonFixtures];
    if (!payload) {
      return Promise.reject(new Error(`Unexpected fetch ${url}`));
    }

    return Promise.resolve({
      json: () => Promise.resolve(payload),
    } as Response);
  });
};

describe('SecurityTools catalog', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'fetch', {
      writable: true,
      value: createFetchMock(),
    });
    window.localStorage.setItem('security-tools-lab-ok', 'true');
    window.localStorage.setItem('lab-mode', 'true');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  it('surfaces dataset metadata as tabs toggle', async () => {
    const user = userEvent.setup();
    render(<SecurityTools />);

    await screen.findByText(/Status: Stable simulation/i);
    expect(screen.getByText(/Generated commands/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Suricata Logs/i }));
    await screen.findByText(/Status: Fixture demo/i);
    expect(screen.getByText(/fixtures\/suricata\.json/i)).toBeInTheDocument();
  });

  it('filters across datasets with global search', async () => {
    const user = userEvent.setup();
    render(<SecurityTools />);

    await screen.findByText(/Status: Stable simulation/i);

    const searchBox = screen.getByPlaceholderText(/Search all tools/i);
    await user.type(searchBox, 'Exploit');

    expect(await screen.findByText(/Suricata/i)).toBeInTheDocument();
    expect(screen.getByText(/Exploit attempt detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Exploit Public-Facing Application/i)).toBeInTheDocument();
  });
});
