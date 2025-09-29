"use client";

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';

type InstallerId = 'deb' | 'rpm' | 'dmg' | 'exe' | 'generic';

type InstallerConfig = {
  href: string;
  label: string;
  cta: string;
};

const INSTALLER_CONFIG: Record<InstallerId, InstallerConfig> = {
  deb: {
    href: 'https://www.kali.org/get-kali/#kali-installer-images',
    label: 'Download Kali Linux installer for Debian-based systems (.deb)',
    cta: 'Download for Linux (.deb)',
  },
  rpm: {
    href: 'https://www.kali.org/get-kali/#kali-installer-images',
    label: 'Download Kali Linux installer for RPM-based systems (.rpm)',
    cta: 'Download for Linux (.rpm)',
  },
  dmg: {
    href: 'https://www.kali.org/get-kali/#kali-installer-images',
    label: 'Download Kali Linux installer for macOS (.dmg)',
    cta: 'Download for macOS (.dmg)',
  },
  exe: {
    href: 'https://www.kali.org/get-kali/#kali-installer-images',
    label: 'Download Kali Linux installer for Windows (.exe)',
    cta: 'Download for Windows (.exe)',
  },
  generic: {
    href: 'https://www.kali.org/get-kali/',
    label: 'View all Kali Linux download options',
    cta: 'View download options',
  },
};

const RPM_LINUX_HINTS = [
  /fedora/i,
  /centos/i,
  /red hat/i,
  /rhel/i,
  /suse/i,
  /opensuse/i,
  /oracle linux/i,
  /alma?s? linux/i,
  /rocky linux/i,
  /mageia/i,
  /mandriva/i,
];

const resolveInstallerId = (): InstallerId => {
  if (typeof navigator === 'undefined') {
    return 'generic';
  }

  const nav = navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
  const userAgent = nav.userAgent || '';
  const lowerUserAgent = userAgent.toLowerCase();

  const uaDataPlatform = nav.userAgentData?.platform?.toLowerCase() ?? '';
  const uaDataMobile = nav.userAgentData?.mobile;

  if (uaDataMobile === true || /android|iphone|ipad|ipod/.test(lowerUserAgent)) {
    return 'generic';
  }

  if (uaDataPlatform.includes('windows')) {
    return 'exe';
  }

  if (uaDataPlatform.includes('mac')) {
    return 'dmg';
  }

  if (uaDataPlatform.includes('linux') || uaDataPlatform.includes('chrome os')) {
    return RPM_LINUX_HINTS.some((regex) => regex.test(lowerUserAgent)) ? 'rpm' : 'deb';
  }

  if (uaDataPlatform.includes('android') || uaDataPlatform.includes('ios')) {
    return 'generic';
  }

  if (/windows nt/.test(lowerUserAgent)) {
    return 'exe';
  }

  if (/(macintosh|mac os x)/.test(lowerUserAgent)) {
    return 'dmg';
  }

  if (/linux|cros/.test(lowerUserAgent)) {
    return RPM_LINUX_HINTS.some((regex) => regex.test(lowerUserAgent)) ? 'rpm' : 'deb';
  }

  return 'generic';
};

const InstallButton: React.FC = () => {
  const [installerId, setInstallerId] = useState<InstallerId>('generic');

  useEffect(() => {
    setInstallerId(resolveInstallerId());
  }, []);

  const installer = INSTALLER_CONFIG[installerId];

  const handleClick = () => {
    trackEvent('cta_click', { location: 'install_button', installer: installerId });
  };

  return (
    <a
      href={installer.href}
      className="inline-flex items-center justify-center rounded bg-ubt-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-ubt-blue/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ubt-blue"
      aria-label={installer.label}
      title={installer.label}
      onClick={handleClick}
    >
      {installer.cta}
    </a>
  );
};

export default InstallButton;

export { INSTALLER_CONFIG, resolveInstallerId };
