import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../hooks/useSettings';

type OverlaySettingsState = {
  showGrid: boolean;
  showFlex: boolean;
  showRulers: boolean;
  showGuides: boolean;
  gridColor: string;
  flexColor: string;
  guideColor: string;
};

type OverlayToggleKey = 'showGrid' | 'showFlex' | 'showRulers' | 'showGuides';
type OverlayColorKey = 'gridColor' | 'flexColor' | 'guideColor';

const DEFAULT_OVERLAY_COLORS = {
  grid: '#38bdf8',
  flex: '#f97316',
  guide: '#22c55e',
} as const;

const HIGH_CONTRAST_FALLBACK = {
  grid: '#ffffff',
  flex: '#facc15',
  guide: '#22d3ee',
} as const;

type RGB = { r: number; g: number; b: number };

const clampColorValue = (value: number) => Math.max(0, Math.min(255, value));

const hexToRgb = (hex: string): RGB => {
  const normalized = hex.replace('#', '').trim();
  if (![3, 6].includes(normalized.length)) {
    return { r: 0, g: 0, b: 0 };
  }
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const intValue = parseInt(value, 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const rgbToHex = ({ r, g, b }: RGB) =>
  `#${clampColorValue(r).toString(16).padStart(2, '0')}${clampColorValue(g)
    .toString(16)
    .padStart(2, '0')}${clampColorValue(b).toString(16).padStart(2, '0')}`.toLowerCase();

const mixHexColors = (color: string, fallback: string, ratio: number) => {
  const base = hexToRgb(color);
  const target = hexToRgb(fallback);
  const blend = {
    r: Math.round(base.r * (1 - ratio) + target.r * ratio),
    g: Math.round(base.g * (1 - ratio) + target.g * ratio),
    b: Math.round(base.b * (1 - ratio) + target.b * ratio),
  };
  return rgbToHex(blend);
};

const hexToRgba = (color: string, alpha: number) => {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  if (['input', 'textarea', 'select'].includes(tagName)) {
    return true;
  }
  return target.isContentEditable;
};

export type SimulationLink = {
  label: string;
  href: string;
  description?: string;
};

export type SimulationSection = {
  title: string;
  body?: string;
  links?: SimulationLink[];
};

export type FirefoxSimulation = {
  url: string;
  heading: string;
  description: string;
  sections: SimulationSection[];
  externalUrl: string;
  ctaLabel?: string;
};

export const toSimulationKey = (value: string) => {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    const normalizedPath = url.pathname.replace(/\/+$/, '');
    const path = normalizedPath || '/';
    return `${url.origin}${path}`.toLowerCase();
  } catch {
    return null;
  }
};

const createSimulationEntry = (simulation: FirefoxSimulation) => {
  const key = toSimulationKey(simulation.url);
  if (!key) {
    throw new Error(`Invalid simulation URL: ${simulation.url}`);
  }
  return [key, simulation] as const;
};

export const SIMULATIONS = Object.fromEntries([
  createSimulationEntry({
    url: 'https://www.kali.org/docs/',
    heading: 'Kali Linux Documentation',
    description:
      'Explore official guidance on getting started with Kali Linux, configuring daily workflows, and securing your lab environment.',
    sections: [
      {
        title: 'Start here',
        body:
          'Learn how Kali Linux is structured, when to use it, and what to expect from rolling releases before you dive into advanced topics.',
        links: [
          {
            label: 'What is Kali Linux?',
            href: 'https://www.kali.org/docs/introduction/what-is-kali-linux/',
            description: 'Overview of the distribution, intended audiences, and project goals.',
          },
          {
            label: 'Should I use Kali Linux?',
            href: 'https://www.kali.org/docs/introduction/should-i-use-kali-linux/',
            description: 'Helps decide if Kali Linux matches your learning or professional needs.',
          },
          {
            label: 'Getting started with Kali',
            href: 'https://www.kali.org/docs/introduction/getting-started-with-kali/',
            description: 'Step-by-step onboarding covering installation options and first boot tips.',
          },
        ],
      },
      {
        title: 'Daily operations',
        body:
          'Tune desktop features, package management, and remote access so your toolkit behaves predictably during engagements.',
        links: [
          {
            label: 'Package management essentials',
            href: 'https://www.kali.org/docs/general-use/kali-linux-package-management/',
            description: 'Master APT usage, meta-packages, and keeping your system current.',
          },
          {
            label: 'Remote sessions with SSH',
            href: 'https://www.kali.org/docs/general-use/using-ssh/',
            description: 'Secure shell configuration tips for managing Kali from other machines.',
          },
          {
            label: 'Shells & terminals overview',
            href: 'https://www.kali.org/docs/general-use/shells-terminals-and-consoles-overview/',
            description: 'Compare terminal experiences, multiplexers, and console workflows.',
          },
        ],
      },
      {
        title: 'Security baseline',
        body:
          'Keep lab systems hardened with checklists that focus on least privilege, backups, and safe tool experimentation.',
        links: [
          {
            label: 'Securing Kali Linux',
            href: 'https://www.kali.org/docs/introduction/securing-kali-linux/',
            description: 'Recommended hardening practices before using Kali in production.',
          },
          {
            label: 'Setting up rootless sessions',
            href: 'https://www.kali.org/docs/policy/kali-linux-root-user-policy/',
            description: 'Understand the root user policy and how to operate as a standard user.',
          },
          {
            label: 'Backups & snapshots',
            href: 'https://www.kali.org/docs/troubleshooting/backing-up-kali-linux/',
            description: 'Plan snapshot and backup strategies to recover from experiments quickly.',
          },
        ],
      },
    ],
    externalUrl: 'https://www.kali.org/docs/',
    ctaLabel: 'Open kali.org/docs',
  }),
  createSimulationEntry({
    url: 'https://www.kali.org/',
    heading: 'Kali Linux Project',
    description:
      'See what is new in the Kali Linux ecosystem, from fresh toolsets and desktop enhancements to community spotlights.',
    sections: [
      {
        title: 'Latest releases',
        body:
          'Track the most recent rolling release, check upgrade notes, and review kernel updates before you patch your machines.',
        links: [
          {
            label: 'Release announcements',
            href: 'https://www.kali.org/blog/',
            description: 'Official blog posts covering changelogs, features, and known issues.',
          },
          {
            label: 'Kali release cadence',
            href: 'https://www.kali.org/releases/',
            description: 'Calendar of past releases and the upcoming quarterly schedule.',
          },
        ],
      },
      {
        title: 'Download options',
        body:
          'Choose between installer images, live environments, ARM builds, and cloud-ready snapshots for rapid deployment.',
        links: [
          {
            label: 'Kali downloads hub',
            href: 'https://www.kali.org/get-kali/',
            description: 'ISO images, virtual machine appliances, and cloud marketplace links.',
          },
          {
            label: 'Kali everywhere',
            href: 'https://www.kali.org/blog/announcing-kali-linux-everywhere/',
            description: 'Overview of supported hardware targets and remote access flows.',
          },
        ],
      },
      {
        title: 'Stay involved',
        body:
          'Join the Kali community, contribute patches, and participate in local or online meetups to sharpen your skills.',
        links: [
          {
            label: 'Community forums',
            href: 'https://forums.kali.org/',
            description: 'Ask questions, share setups, and help other practitioners.',
          },
          {
            label: 'Contribution guide',
            href: 'https://www.kali.org/docs/community/working-with-kali-linux/',
            description: 'How to report bugs, submit improvements, and track project boards.',
          },
        ],
      },
    ],
    externalUrl: 'https://www.kali.org/',
    ctaLabel: 'Visit kali.org',
  }),
  createSimulationEntry({
    url: 'https://www.kali.org/tools/',
    heading: 'Kali Linux Tools Catalog',
    description:
      'Browse over 600 curated security tools packaged with Kali Linux. Filter by category and usage to plan your next assessment.',
    sections: [
      {
        title: 'Popular categories',
        body:
          'Start with these essential tool groups to cover reconnaissance, exploitation, and reporting in your workflow.',
        links: [
          {
            label: 'Information Gathering',
            href: 'https://www.kali.org/tools/?k=information-gathering',
            description: 'Footprinting utilities for mapping networks and enumerating targets.',
          },
          {
            label: 'Vulnerability Analysis',
            href: 'https://www.kali.org/tools/?k=vulnerability-analysis',
            description: 'Scanners that highlight misconfigurations and patching priorities.',
          },
          {
            label: 'Exploitation Tools',
            href: 'https://www.kali.org/tools/?k=exploitation-tools',
            description: 'Frameworks and utilities for controlled exploitation in labs.',
          },
        ],
      },
      {
        title: 'Find the right package',
        body:
          'Search by name, category, or tags to uncover companion utilities and supporting libraries.',
        links: [
          {
            label: 'Tool search',
            href: 'https://www.kali.org/tools/?c=all&tool=&k=all',
            description: 'Filter the full catalog alphabetically or by capability.',
          },
          {
            label: 'Meta-packages overview',
            href: 'https://www.kali.org/docs/general-use/metapackages/',
            description: 'Install groups of related tools tailored to specific roles.',
          },
        ],
      },
      {
        title: 'Responsible usage',
        body:
          'Every tool ships with a disclaimer reminding you to operate within legal and ethical boundaries.',
        links: [
          {
            label: 'Kali tool disclaimer',
            href: 'https://www.kali.org/docs/policy/disclaimer/',
            description: 'Understand the legal framing for using Kali Linux utilities.',
          },
          {
            label: 'Learning path suggestions',
            href: 'https://www.offsec.com/courses/',
            description: 'Complement Kali tools with structured OffSec training paths.',
          },
        ],
      },
    ],
    externalUrl: 'https://www.kali.org/tools/',
    ctaLabel: 'Open kali.org/tools',
  }),
  createSimulationEntry({
    url: 'https://forums.kali.org/',
    heading: 'Kali Linux Forums',
    description:
      'Connect with other Kali users, troubleshoot installations, and share knowledge with the global community.',
    sections: [
      {
        title: 'Get unstuck',
        body:
          'Search existing threads before posting a new question. Tag your topic clearly so others can help quickly.',
        links: [
          {
            label: 'Installation & upgrades',
            href: 'https://forums.kali.org/forumdisplay.php?f=8',
            description: 'Discuss ISO installs, dual-boot setups, and rolling release updates.',
          },
          {
            label: 'General use',
            href: 'https://forums.kali.org/forumdisplay.php?f=19',
            description: 'Tune desktop environments, drivers, and daily workflows.',
          },
        ],
      },
      {
        title: 'Share insights',
        body:
          'Document your lab findings, custom scripts, and favorite configurations to help the next practitioner.',
        links: [
          {
            label: 'How-to tutorials',
            href: 'https://forums.kali.org/forumdisplay.php?f=13',
            description: 'Step-by-step guides submitted by the community.',
          },
          {
            label: 'Tool development',
            href: 'https://forums.kali.org/forumdisplay.php?f=68',
            description: 'Collaborate on open-source tooling and share beta feedback.',
          },
        ],
      },
      {
        title: 'Follow the rules',
        body:
          'Forum moderators enforce a strict code of conduct—review it before engaging so discussions stay productive.',
        links: [
          {
            label: 'Community guidelines',
            href: 'https://forums.kali.org/announcement.php?f=8',
            description: 'Read the terms of service and moderation policies.',
          },
        ],
      },
    ],
    externalUrl: 'https://forums.kali.org/',
    ctaLabel: 'Visit forums.kali.org',
  }),
  createSimulationEntry({
    url: 'https://www.kali.org/get-kali/',
    heading: 'Kali NetHunter & Downloads',
    description:
      'Discover official Kali Linux images alongside NetHunter builds for supported Android devices and mobile workflows.',
    sections: [
      {
        title: 'Choose your platform',
        body:
          'Select the image that matches your target environment: bare metal, virtual machines, ARM devices, or cloud providers.',
        links: [
          {
            label: 'Installer & live ISOs',
            href: 'https://www.kali.org/get-kali/#kali-installer-images',
            description: 'Grab weekly images or the latest quarterly release.',
          },
          {
            label: 'Virtual machine downloads',
            href: 'https://www.kali.org/get-kali/#kali-virtual-machines',
            description: 'Ready-to-import VMware, VirtualBox, and Hyper-V appliances.',
          },
          {
            label: 'Cloud marketplace listings',
            href: 'https://www.kali.org/get-kali/#cloud',
            description: 'Launch Kali instances in AWS, Azure, GCP, and more.',
          },
        ],
      },
      {
        title: 'Kali NetHunter',
        body:
          'Extend Kali Linux to compatible Android devices with NetHunter builds backed by extensive documentation.',
        links: [
          {
            label: 'NetHunter downloads',
            href: 'https://www.kali.org/get-kali/#kali-mobile',
            description: 'Images, compatibility notes, and flashing instructions.',
          },
          {
            label: 'NetHunter documentation',
            href: 'https://www.kali.org/docs/nethunter/nethunter-rootless/',
            description: 'Guides for rootless, termux, and full-featured installations.',
          },
        ],
      },
      {
        title: 'Verify your downloads',
        body:
          'Always check checksums and signatures before booting a new image to ensure integrity.',
        links: [
          {
            label: 'Signature verification guide',
            href: 'https://www.kali.org/docs/introduction/download-official-kali-linux-images/',
            description: 'Step-by-step instructions for verifying ISO integrity.',
          },
        ],
      },
    ],
    externalUrl: 'https://www.kali.org/get-kali/#kali-platforms',
    ctaLabel: 'Open kali.org/get-kali',
  }),
  createSimulationEntry({
    url: 'https://www.offsec.com/',
    heading: 'OffSec Training & Certifications',
    description:
      'Level up with official Offensive Security training paths that pair well with Kali Linux practice labs.',
    sections: [
      {
        title: 'Featured courses',
        body:
          'Structured curriculums for penetration testing, exploit development, and defensive skills.',
        links: [
          {
            label: 'PEN-200: Penetration Testing with Kali Linux',
            href: 'https://www.offsec.com/courses/pen-200/',
            description: 'Prepare for the OSCP certification with a hands-on lab and proctored exam.',
          },
          {
            label: 'SOC-200: Security Operations',
            href: 'https://www.offsec.com/courses/soc-200/',
            description: 'Build blue-team skills with detection and response exercises.',
          },
        ],
      },
      {
        title: 'Certification paths',
        body:
          'Map out your Offensive Security journey with stacked credentials and continuous learning plans.',
        links: [
          {
            label: 'Certification roadmap',
            href: 'https://www.offsec.com/certifications/',
            description: 'Compare requirements for OSCP, OSCE3, OSEE, and more.',
          },
          {
            label: 'Learning library',
            href: 'https://www.offsec.com/learn/',
            description: 'Self-paced content, webinars, and community events.',
          },
        ],
      },
      {
        title: 'Stay informed',
        body:
          'Subscribe to OffSec updates for announcements about new content and lab refreshes.',
        links: [
          {
            label: 'OffSec blog',
            href: 'https://www.offsec.com/blog/',
            description: 'Insights from the team, exam updates, and community spotlights.',
          },
        ],
      },
    ],
    externalUrl: 'https://www.offsec.com/?utm_source=kali&utm_medium=os&utm_campaign=firefox',
    ctaLabel: 'Open offsec.com',
  }),
  createSimulationEntry({
    url: 'https://www.exploit-db.com/',
    heading: 'Exploit Database',
    description:
      'Research public exploits, shellcode, and security whitepapers curated by the Offensive Security team.',
    sections: [
      {
        title: 'Stay current',
        body:
          'Filter exploit submissions by date, platform, type, or verification status.',
        links: [
          {
            label: 'Latest exploits',
            href: 'https://www.exploit-db.com/',
            description: 'Daily feed of newly published proof-of-concept exploits.',
          },
          {
            label: 'Verified exploits',
            href: 'https://www.exploit-db.com/?verified=true',
            description: 'Entries tested by the Exploit Database moderation team.',
          },
        ],
      },
      {
        title: 'Curated resources',
        body:
          'Explore shellcode samples, papers, and security references linked to each exploit entry.',
        links: [
          {
            label: 'Shellcode archive',
            href: 'https://www.exploit-db.com/shellcodes',
            description: 'Ready-to-use shellcode snippets categorized by platform.',
          },
          {
            label: 'Paper library',
            href: 'https://www.exploit-db.com/papers',
            description: 'Whitepapers covering techniques behind the exploit samples.',
          },
        ],
      },
      {
        title: 'Submit responsibly',
        body:
          'Share your own findings and track moderation status through the contributor portal.',
        links: [
          {
            label: 'Submit an exploit',
            href: 'https://www.exploit-db.com/add',
            description: 'Guidelines and form for submitting new exploits to the database.',
          },
        ],
      },
    ],
    externalUrl: 'https://www.exploit-db.com/',
    ctaLabel: 'Visit exploit-db.com',
  }),
  createSimulationEntry({
    url: 'https://www.exploit-db.com/google-hacking-database',
    heading: 'Google Hacking Database',
    description:
      'Leverage curated Google dorks to uncover exposed services, misconfigurations, and sensitive information during reconnaissance.',
    sections: [
      {
        title: 'Browse categories',
        body:
          'Queries are organized by target type so you can jump straight to relevant reconnaissance searches.',
        links: [
          {
            label: 'Files containing juicy info',
            href: 'https://www.exploit-db.com/google-hacking-database',
            description: 'Common exposures like database dumps, credentials, and backups.',
          },
          {
            label: 'Vulnerable servers',
            href: 'https://www.exploit-db.com/google-hacking-database?category=7',
            description: 'Dorks revealing outdated CMS instances and misconfigured services.',
          },
        ],
      },
      {
        title: 'Operate safely',
        body:
          'Always follow legal guidelines when using dorks—stick to systems you own or have explicit permission to assess.',
        links: [
          {
            label: 'Usage policy',
            href: 'https://www.exploit-db.com/ghdb-usage',
            description: 'Understand the ethical expectations behind GHDB research.',
          },
        ],
      },
      {
        title: 'Contribute dorks',
        body:
          'Help expand the database by submitting verified search queries and remediation notes.',
        links: [
          {
            label: 'Submit a dork',
            href: 'https://www.exploit-db.com/add',
            description: 'Share a new query with context and mitigation guidance.',
          },
        ],
      },
    ],
    externalUrl: 'https://www.exploit-db.com/google-hacking-database',
    ctaLabel: 'Open GHDB',
  }),
]) as Record<string, FirefoxSimulation>;

export const FirefoxSimulationView: React.FC<{ simulation: FirefoxSimulation }> = ({ simulation }) => {
  const { highContrast } = useSettings();
  const [overlaySettings, setOverlaySettings] = useState<OverlaySettingsState>(() => ({
    showGrid: true,
    showFlex: false,
    showRulers: true,
    showGuides: true,
    gridColor: DEFAULT_OVERLAY_COLORS.grid,
    flexColor: DEFAULT_OVERLAY_COLORS.flex,
    guideColor: DEFAULT_OVERLAY_COLORS.guide,
  }));
  const [panelOpen, setPanelOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const overlayPalette = useMemo(
    () => ({
      grid: mixHexColors(overlaySettings.gridColor, HIGH_CONTRAST_FALLBACK.grid, highContrast ? 0.65 : 0),
      flex: mixHexColors(overlaySettings.flexColor, HIGH_CONTRAST_FALLBACK.flex, highContrast ? 0.55 : 0),
      guide: mixHexColors(overlaySettings.guideColor, HIGH_CONTRAST_FALLBACK.guide, highContrast ? 0.55 : 0),
    }),
    [overlaySettings.gridColor, overlaySettings.flexColor, overlaySettings.guideColor, highContrast]
  );

  const toggleOverlay = useCallback((key: OverlayToggleKey) => {
    setOverlaySettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateColor = useCallback((key: OverlayColorKey, value: string) => {
    setOverlaySettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleKeyboardToggle = useCallback(
    (event: KeyboardEvent) => {
      if (!event.shiftKey || isEditableTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'g') {
        event.preventDefault();
        toggleOverlay('showGrid');
      } else if (key === 'f') {
        event.preventDefault();
        toggleOverlay('showFlex');
      } else if (key === 'r') {
        event.preventDefault();
        toggleOverlay('showRulers');
      } else if (key === 'l') {
        event.preventDefault();
        toggleOverlay('showGuides');
      }
    },
    [toggleOverlay]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardToggle);
    return () => window.removeEventListener('keydown', handleKeyboardToggle);
  }, [handleKeyboardToggle]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-5">
        <h1 className="text-2xl font-semibold text-white">{simulation.heading}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-300">{simulation.description}</p>
        <a
          href={simulation.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          {simulation.ctaLabel ?? 'Open official site'}
          <span aria-hidden="true" className="text-xs">
            ↗
          </span>
        </a>
      </header>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 shadow-inner">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="overlay-settings-heading" className="text-sm font-semibold text-white">
                  Layout overlay controls
                </h2>
                <p className="mt-1 max-w-xl text-xs text-gray-400">
                  Use <kbd className="rounded bg-gray-800 px-1">Shift</kbd> + <kbd className="rounded bg-gray-800 px-1">G</kbd> for
                  grids, <kbd className="rounded bg-gray-800 px-1">Shift</kbd> + <kbd className="rounded bg-gray-800 px-1">F</kbd> for flex outlines,{' '}
                  <kbd className="rounded bg-gray-800 px-1">Shift</kbd> + <kbd className="rounded bg-gray-800 px-1">R</kbd> for rulers, and{' '}
                  <kbd className="rounded bg-gray-800 px-1">Shift</kbd> + <kbd className="rounded bg-gray-800 px-1">L</kbd> for guides.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen((value) => !value)}
                aria-expanded={panelOpen}
                aria-controls="firefox-overlay-settings"
                className="self-start rounded border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-100 transition hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
              >
                {panelOpen ? 'Hide overlay settings' : 'Show overlay settings'}
              </button>
            </div>
            {panelOpen ? (
              <div
                id="firefox-overlay-settings"
                role="group"
                aria-labelledby="overlay-settings-heading"
                className="mt-4 grid gap-4 text-xs sm:grid-cols-2 sm:text-sm"
              >
                <label className="flex items-center justify-between gap-2 text-gray-200">
                  <span>Grid overlay</span>
                  <input
                    type="checkbox"
                    checked={overlaySettings.showGrid}
                    onChange={() => toggleOverlay('showGrid')}
                    aria-describedby="overlay-grid-hint"
                    className="h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-gray-200">
                  <span>Flex outlines</span>
                  <input
                    type="checkbox"
                    checked={overlaySettings.showFlex}
                    onChange={() => toggleOverlay('showFlex')}
                    aria-describedby="overlay-flex-hint"
                    className="h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-gray-200">
                  <span>Rulers</span>
                  <input
                    type="checkbox"
                    checked={overlaySettings.showRulers}
                    onChange={() => toggleOverlay('showRulers')}
                    className="h-4 w-4"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-gray-200">
                  <span>Guides</span>
                  <input
                    type="checkbox"
                    checked={overlaySettings.showGuides}
                    onChange={() => toggleOverlay('showGuides')}
                    className="h-4 w-4"
                  />
                </label>
                <div className="flex items-center justify-between gap-2 text-gray-200">
                  <label htmlFor="grid-color" className="text-gray-200">
                    Grid color
                  </label>
                  <input
                    id="grid-color"
                    type="color"
                    value={overlaySettings.gridColor}
                    onChange={(event) => updateColor('gridColor', event.target.value)}
                    className="h-8 w-16 cursor-pointer"
                    aria-label="Grid overlay color"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-gray-200">
                  <label htmlFor="flex-color" className="text-gray-200">
                    Flex color
                  </label>
                  <input
                    id="flex-color"
                    type="color"
                    value={overlaySettings.flexColor}
                    onChange={(event) => updateColor('flexColor', event.target.value)}
                    className="h-8 w-16 cursor-pointer"
                    aria-label="Flex overlay color"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 text-gray-200">
                  <label htmlFor="guide-color" className="text-gray-200">
                    Guides & rulers color
                  </label>
                  <input
                    id="guide-color"
                    type="color"
                    value={overlaySettings.guideColor}
                    onChange={(event) => updateColor('guideColor', event.target.value)}
                    className="h-8 w-16 cursor-pointer"
                    aria-label="Guides overlay color"
                  />
                </div>
                <p id="overlay-grid-hint" className="text-[11px] text-gray-400 sm:col-span-2">
                  Grid and ruler overlays are color-blind safe and never capture pointer events so the simulation remains
                  interactive.
                </p>
                <p id="overlay-flex-hint" className="text-[11px] text-gray-400 sm:col-span-2">
                  Flex outlines hug the cards using high-contrast dashed borders for rapid layout auditing.
                </p>
              </div>
            ) : null}
          </section>

          <div
            ref={contentRef}
            className="relative"
            data-testid="firefox-overlay-container"
            data-high-contrast={highContrast ? 'true' : 'false'}
            data-flex-overlay={overlaySettings.showFlex ? 'true' : 'false'}
            data-grid-color={overlayPalette.grid}
            data-flex-color={overlayPalette.flex}
            data-guide-color={overlayPalette.guide}
          >
            <div className="grid gap-6 lg:grid-cols-2">
              {simulation.sections.map((section) => (
                <section
                  key={section.title}
                  data-firefox-overlay="section"
                  className="rounded-lg border border-gray-800 bg-gray-900/60 p-5 shadow-inner transition"
                  style={
                    overlaySettings.showFlex
                      ? {
                          outline: `2px dashed ${overlayPalette.flex}`,
                          outlineOffset: '4px',
                          boxShadow: `inset 0 0 0 1px ${hexToRgba(overlayPalette.flex, highContrast ? 0.9 : 0.5)}`,
                        }
                      : undefined
                  }
                >
                  <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                  {section.body ? <p className="mt-2 text-sm text-gray-300">{section.body}</p> : null}
                  {section.links ? (
                    <ul className="mt-4 space-y-3 text-sm">
                      {section.links.map((link) => (
                        <li
                          key={link.href}
                          className="rounded-md bg-gray-900/80 p-3 transition hover:bg-gray-800/80"
                          style={
                            overlaySettings.showFlex
                              ? {
                                  outline: `1px dashed ${overlayPalette.flex}`,
                                  outlineOffset: '2px',
                                }
                              : undefined
                          }
                        >
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-300 hover:text-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                          >
                            {link.label}
                          </a>
                          {link.description ? <p className="mt-1 text-xs text-gray-400">{link.description}</p> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {overlaySettings.showGrid ? (
                <div
                  data-testid="firefox-grid-overlay"
                  data-grid-color={overlayPalette.grid}
                  className="absolute inset-0 rounded-lg"
                  style={{
                    backgroundImage: `linear-gradient(to right, ${hexToRgba(overlayPalette.grid, highContrast ? 0.85 : 0.6)} 1px, transparent 1px), linear-gradient(to bottom, ${hexToRgba(
                      overlayPalette.grid,
                      highContrast ? 0.85 : 0.6
                    )} 1px, transparent 1px)`,
                    backgroundSize: '48px 48px',
                    mixBlendMode: highContrast ? 'screen' : 'normal',
                  }}
                />
              ) : null}
              {overlaySettings.showRulers ? (
                <div data-testid="firefox-rulers-overlay" className="absolute inset-0">
                  <div
                    className="absolute left-0 right-0 top-0 h-8 rounded-t-lg border-b border-gray-800/60 bg-gray-900/80"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to right, transparent 0, transparent 39px, ${hexToRgba(
                        overlayPalette.guide,
                        0.75
                      )} 39px, ${hexToRgba(overlayPalette.guide, 0.75)} 40px)`,
                    }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute bottom-0 left-0 top-0 w-8 rounded-l-lg border-r border-gray-800/60 bg-gray-900/80"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent 39px, ${hexToRgba(
                        overlayPalette.guide,
                        0.75
                      )} 39px, ${hexToRgba(overlayPalette.guide, 0.75)} 40px)`,
                    }}
                    aria-hidden="true"
                  />
                </div>
              ) : null}
              {overlaySettings.showGuides ? (
                <div data-testid="firefox-guides-overlay" className="absolute inset-0">
                  <div
                    className="absolute top-1/2 left-0 right-0 h-0.5"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to right, ${hexToRgba(
                        overlayPalette.guide,
                        0.9
                      )} 0, ${hexToRgba(overlayPalette.guide, 0.9)} 6px, transparent 6px, transparent 12px)`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 left-1/2 w-0.5"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, ${hexToRgba(
                        overlayPalette.guide,
                        0.9
                      )} 0, ${hexToRgba(overlayPalette.guide, 0.9)} 6px, transparent 6px, transparent 12px)`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 left-[25%] w-0.5"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, ${hexToRgba(
                        overlayPalette.grid,
                        0.75
                      )} 0, ${hexToRgba(overlayPalette.grid, 0.75)} 4px, transparent 4px, transparent 8px)`,
                    }}
                  />
                  <div
                    className="absolute top-[35%] left-0 right-0 h-0.5"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to right, ${hexToRgba(
                        overlayPalette.flex,
                        0.75
                      )} 0, ${hexToRgba(overlayPalette.flex, 0.75)} 4px, transparent 4px, transparent 8px)`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
