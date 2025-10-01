import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Banners, { sanitizeBannerText } from '../components/apps/nmap-nse/Banners';

describe('Nmap NSE Banners', () => {
  const sampleBanners = [
    {
      host: '192.0.2.10',
      port: 80,
      protocol: 'tcp',
      service: 'http',
      banner: 'HTTP/1.1 200 OK\nServer: Apache httpd 2.4.54\nX-Powered-By: PHP/8.1.6',
    },
    {
      host: '192.0.2.11',
      port: 8080,
      protocol: 'tcp',
      service: 'http',
      banner: 'HTTP/1.1 403 Forbidden\nServer: Apache Tomcat 9.0.65',
    },
    {
      host: '192.0.2.30',
      port: 22,
      protocol: 'tcp',
      service: 'ssh',
      banner: 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5',
    },
  ];

  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    jest.resetAllMocks();
    if (originalClipboard) {
      Object.assign(navigator, { clipboard: originalClipboard });
    } else {
      delete (navigator as any).clipboard;
    }
  });

  it('groups banners by service and shows the correct counts', () => {
    render(<Banners banners={sampleBanners} />);
    const httpHeader = screen.getByText('http').closest('header');
    expect(httpHeader).toBeInTheDocument();
    const httpSection = httpHeader?.parentElement;
    expect(httpSection).toBeTruthy();
    if (!httpSection) throw new Error('Missing http section');
    expect(within(httpSection).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('ssh')).toBeInTheDocument();
  });

  it('highlights version tokens automatically', () => {
    render(<Banners banners={sampleBanners} />);
    const versionSpan = screen.getByText((content, element) =>
      element instanceof HTMLElement &&
      element.dataset.highlight === 'version' &&
      content.includes('2.4.54')
    );
    expect(versionSpan).toBeInTheDocument();

    const sshVersion = screen.getByText((content, element) =>
      element instanceof HTMLElement &&
      element.dataset.highlight === 'version' &&
      content.includes('OpenSSH_8.2p1')
    );
    expect(sshVersion).toBeInTheDocument();
  });

  it('highlights search matches', () => {
    render(<Banners banners={sampleBanners} />);
    fireEvent.change(screen.getByLabelText('Search banners'), { target: { value: 'apache' } });

    const highlightedMatches = screen
      .getAllByText('Apache', { exact: false })
      .filter((node) =>
        node instanceof HTMLElement ? node.dataset.highlight === 'query' : false
      );
    expect(highlightedMatches.length).toBeGreaterThan(0);
  });

  it('sanitizes control characters before copying', async () => {
    const clipboardWrite = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWrite,
      },
    });
    const onCopy = jest.fn();
    const noisyBanner = [
      {
        host: '192.0.2.55',
        port: 25,
        protocol: 'tcp',
        service: 'smtp',
        banner: '220 Ready\u0007',
      },
    ];

    render(<Banners banners={noisyBanner} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: /copy banner for 192.0.2.55:25/i }));

    await waitFor(() => expect(clipboardWrite).toHaveBeenCalled());
    expect(clipboardWrite).toHaveBeenCalledWith('220 Ready');
    expect(onCopy).toHaveBeenCalledWith('Banner copied');
  });

  it('exposes sanitizer helper for unit testing', () => {
    expect(sanitizeBannerText('Test\u0000Value')).toBe('TestValue');
  });
});
