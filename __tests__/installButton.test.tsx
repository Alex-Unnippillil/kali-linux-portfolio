import { render, screen } from '@testing-library/react';
import InstallButton, { INSTALLER_CONFIG } from '../components/InstallButton';

const originalUserAgent = navigator.userAgent;
const originalUserAgentData = (navigator as any).userAgentData;

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, 'userAgent', {
    value,
    configurable: true,
  });
};

const setUserAgentData = (value?: { platform?: string; mobile?: boolean }) => {
  if (typeof value === 'undefined') {
    delete (window.navigator as any).userAgentData;
    return;
  }

  Object.defineProperty(window.navigator, 'userAgentData', {
    value,
    configurable: true,
  });
};

describe('InstallButton platform detection', () => {
  afterEach(() => {
    setUserAgent(originalUserAgent);
    if (typeof originalUserAgentData === 'undefined') {
      delete (window.navigator as any).userAgentData;
    } else {
      setUserAgentData(originalUserAgentData);
    }
  });

  test('prefers Windows installer when client hints indicate Windows', async () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    setUserAgentData({ platform: 'Windows', mobile: false });

    render(<InstallButton />);

    const link = await screen.findByRole('link', {
      name: INSTALLER_CONFIG.exe.label,
    });

    expect(link).toHaveTextContent(INSTALLER_CONFIG.exe.cta);
    expect(link).toHaveAttribute('href', INSTALLER_CONFIG.exe.href);
  });

  test('falls back to UA sniffing for macOS when client hints unavailable', async () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15');
    setUserAgentData(undefined);

    render(<InstallButton />);

    const link = await screen.findByRole('link', {
      name: INSTALLER_CONFIG.dmg.label,
    });

    expect(link).toHaveTextContent(INSTALLER_CONFIG.dmg.cta);
  });

  test('detects RPM-based Linux distributions via user agent keywords', async () => {
    setUserAgent('Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');
    setUserAgentData({ platform: 'Linux', mobile: false });

    render(<InstallButton />);

    const link = await screen.findByRole('link', {
      name: INSTALLER_CONFIG.rpm.label,
    });

    expect(link).toHaveTextContent(INSTALLER_CONFIG.rpm.cta);
  });

  test('uses generic fallback for iOS user agents', async () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1');
    setUserAgentData(undefined);

    render(<InstallButton />);

    const link = await screen.findByRole('link', {
      name: INSTALLER_CONFIG.generic.label,
    });

    expect(link).toHaveTextContent(INSTALLER_CONFIG.generic.cta);
  });

  test('uses generic fallback for Android mobile hints', async () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36');
    setUserAgentData({ platform: 'Android', mobile: true });

    render(<InstallButton />);

    const link = await screen.findByRole('link', {
      name: INSTALLER_CONFIG.generic.label,
    });

    expect(link).toHaveTextContent(INSTALLER_CONFIG.generic.cta);
  });
});
