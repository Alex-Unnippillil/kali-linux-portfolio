import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import Dsniff from '../components/apps/dsniff';
import type { UrlsnarfEntry } from '../tests/builders/dsniff';

function getUrlsnarfEntries(): UrlsnarfEntry[] {
  return [
    { protocol: 'HTTP', host: 'example.com', path: '/index.html' },
    { protocol: 'HTTPS', host: 'test.com', path: '/login' },
  ];
}

function loadUrlsnarfFixture() {
  const { buildUrlsnarfFixture } = require('../tests/builders/dsniff') as typeof import('../tests/builders/dsniff');
  return buildUrlsnarfFixture(getUrlsnarfEntries());
}

function loadArpspoofFixture() {
  const { buildArpspoofFixture } = require('../tests/builders/dsniff') as typeof import('../tests/builders/dsniff');
  return buildArpspoofFixture();
}

function loadPcapFixture() {
  const { buildPcapFixture } = require('../tests/builders/dsniff') as typeof import('../tests/builders/dsniff');
  return buildPcapFixture({
    summary: [
      {
        src: '192.168.0.5',
        dst: getUrlsnarfEntries()[0].host,
        protocol: 'HTTP',
        info: 'POST /login username=demo password=demo123',
      },
    ],
  });
}

jest.mock('../public/demo-data/dsniff/urlsnarf.json', () => ({
  __esModule: true,
  default: loadUrlsnarfFixture(),
}));

jest.mock('../public/demo-data/dsniff/arpspoof.json', () => ({
  __esModule: true,
  default: loadArpspoofFixture(),
}));

jest.mock('../public/demo-data/dsniff/pcap.json', () => ({
  __esModule: true,
  default: loadPcapFixture(),
}));

describe('Dsniff component', () => {
  it('shows urlsnarf logs from builder fixture', async () => {
    render(<Dsniff />);
    for (const { host } of getUrlsnarfEntries()) {
      expect((await screen.findAllByText(host)).length).toBeGreaterThan(0);
    }
  });

  it('applies host filter', async () => {
    render(<Dsniff />);
    const logArea = screen.getByRole('log');
    const hostToFilter = getUrlsnarfEntries()[0].host;
    await within(logArea).findByText(hostToFilter);

    fireEvent.change(screen.getByPlaceholderText('Value'), {
      target: { value: hostToFilter },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(within(logArea).getAllByText(hostToFilter).length).toBeGreaterThan(0);
    expect(within(logArea).queryByText(getUrlsnarfEntries()[1].host)).toBeNull();
  });

  it('displays pcap summary and remediation', async () => {
    render(<Dsniff />);
    expect(
      await screen.findByText('PCAP credential leakage demo')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/HTTPS\/TLS to encrypt credentials/i)
    ).toBeInTheDocument();
  });

  it('obfuscates credentials by default and reveals on click', async () => {
    render(<Dsniff />);
    const obfuscated = await screen.findAllByText('***');
    expect(obfuscated.length).toBeGreaterThan(0);
    const showButtons = await screen.findAllByText('Show');
    fireEvent.click(showButtons[0]);
    const revealed = await screen.findAllByText(/demo123/i, undefined, {
      timeout: 2000,
    });
    expect(revealed.length).toBeGreaterThan(0);
  });
});

