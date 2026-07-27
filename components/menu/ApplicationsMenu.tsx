import React, { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';

export type KaliCategory = {
  id: string;
  label: string;
};

export const KALI_CATEGORIES: KaliCategory[] = [
  { id: 'information-gathering', label: 'Information Gathering' },
  { id: 'vulnerability-analysis', label: 'Vulnerability Analysis' },
  { id: 'web-application-analysis', label: 'Web Application Analysis' },
  { id: 'database-assessment', label: 'Database Assessment' },
  { id: 'password-attacks', label: 'Password Attacks' },
  { id: 'wireless-attacks', label: 'Wireless Attacks' },
  { id: 'reverse-engineering', label: 'Reverse Engineering' },
  { id: 'exploitation-tools', label: 'Exploitation Tools' },
  { id: 'sniffing-spoofing', label: 'Sniffing & Spoofing' },
  { id: 'post-exploitation', label: 'Post Exploitation' },
  { id: 'forensics', label: 'Forensics' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'social-engineering', label: 'Social Engineering' },
  { id: 'hardware-hacking', label: 'Hardware Hacking' },
  { id: 'extra', label: 'Extra' },
  { id: 'top10', label: 'Top 10 Security Tools' },
];

const DEFAULT_CATEGORY_ICON = '/themes/Yaru/status/preferences-system-symbolic.svg';

const CATEGORY_ICON_LOOKUP: Record<string, string> = {
  'information-gathering': '/themes/kali/categories/information-gathering.svg',
  'vulnerability-analysis': '/themes/kali/categories/vulnerability-analysis.svg',
  'web-application-analysis': '/themes/kali/categories/web-application-analysis.svg',
  'database-assessment': '/themes/kali/categories/database-assessment.svg',
  'password-attacks': '/themes/kali/categories/password-attacks.svg',
  'wireless-attacks': '/themes/kali/categories/wireless-attacks.svg',
  'reverse-engineering': '/themes/kali/categories/reverse-engineering.svg',
  'exploitation-tools': '/themes/kali/categories/exploitation-tools.svg',
  'sniffing-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'sniffing-and-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'post-exploitation': '/themes/kali/categories/post-exploitation.svg',
  'maintaining-access': '/themes/kali/categories/post-exploitation.svg',
  'forensics': '/themes/kali/categories/forensics.svg',
  'reporting': '/themes/kali/categories/reporting.svg',
  'reporting-tools': '/themes/kali/categories/reporting.svg',
  'social-engineering': '/themes/kali/categories/social-engineering.svg',
  'social-engineering-tools': '/themes/kali/categories/social-engineering.svg',
  'hardware-hacking': '/themes/kali/categories/hardware-hacking.svg',
  'extra': '/themes/kali/categories/extra.svg',
  'miscellaneous': '/themes/kali/categories/extra.svg',
  'top10': '/themes/kali/categories/top10.svg',
  'top-10-tools': '/themes/kali/categories/top10.svg',
  'stress-testing': '/themes/kali/categories/exploitation-tools.svg',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'information-gathering': 'Reconnaissance utilities for enumerating hosts, services, and potential entry points.',
  'vulnerability-analysis': 'Analyze discovered assets for known weaknesses and misconfigurations before exploitation.',
  'web-application-analysis': 'Inspect, crawl, and fuzz web applications to uncover authentication and logic flaws.',
  'database-assessment': 'Audit database servers with schema discovery, permission reviews, and sample exploit flows.',
  'password-attacks': 'Simulated cracking suites with wordlists, rules, and hybrid attacks for credential testing.',
  'wireless-attacks': 'Wireless sniffers and injection demos that explore Wi-Fi, BLE, and RF attack surfaces.',
  'reverse-engineering': 'Static and dynamic binary analysis labs for disassembly, decompilation, and patching practice.',
  'exploitation-tools': 'Exploit development workbenches with payload builders and controlled shell sessions.',
  'sniffing-spoofing': 'Traffic inspection and spoofing scenarios to study interception and man-in-the-middle techniques.',
  'post-exploitation': 'Persistence, lateral movement, and data staging utilities for simulated compromised hosts.',
  'forensics': 'Disk, memory, and network forensics environments to reconstruct incidents and timelines.',
  'reporting': 'Reporting aides for aggregating findings, screenshots, and remediation notes.',
  'social-engineering': 'Frameworks for planning and rehearsing social engineering engagements ethically.',
  'hardware-hacking': 'Board analysis, firmware extraction, and embedded debugging walk-throughs.',
  'extra': 'Miscellaneous demonstrations and helper utilities that do not fit other Kali groupings.',
  'top10': 'A curated tour of the most iconic Kali security tools and simulations in one place.',
};

const DESCRIPTION_FALLBACK = 'Explore curated Kali simulations and utilities in this category.';

type CategoryIconProps = {
  categoryId: string;
  label: string;
};

const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, label }) => {
  const [src, setSrc] = useState<string>(CATEGORY_ICON_LOOKUP[categoryId] ?? DEFAULT_CATEGORY_ICON);

  useEffect(() => {
    setSrc(CATEGORY_ICON_LOOKUP[categoryId] ?? DEFAULT_CATEGORY_ICON);
  }, [categoryId]);

  return (
    <Image
      src={src}
      alt={`${label} category icon`}
      width={20}
      height={20}
      className="h-5 w-5 flex-shrink-0"
      onError={() => {
        if (src !== DEFAULT_CATEGORY_ICON) {
          setSrc(DEFAULT_CATEGORY_ICON);
        }
      }}
    />
  );
};

type ApplicationsMenuProps = {
  activeCategory: string;
  onSelect: (id: string) => void;
};

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({ activeCategory, onSelect }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(activeCategory ?? null);
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const headingId = useId();

  useEffect(() => {
    setExpandedCategory(activeCategory ?? null);
  }, [activeCategory]);

  const handleToggleCategory = (categoryId: string) => {
    setExpandedCategory((previous) => {
      if (previous === categoryId) {
        return null;
      }

      return categoryId;
    });

    if (expandedCategory !== categoryId) {
      onSelect(categoryId);
    }
  };

  const focusCategoryAtIndex = (index: number) => {
    const normalizedIndex = ((index % KALI_CATEGORIES.length) + KALI_CATEGORIES.length) % KALI_CATEGORIES.length;
    headerRefs.current[normalizedIndex]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.metaKey || event.ctrlKey) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        focusCategoryAtIndex(index + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        focusCategoryAtIndex(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusCategoryAtIndex(0);
        break;
      case 'End':
        event.preventDefault();
        focusCategoryAtIndex(KALI_CATEGORIES.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-x-0 bottom-0 z-40 flex h-[100dvh] max-h-[100dvh] flex-col bg-slate-950/95 text-white shadow-2xl backdrop-blur-sm sm:relative sm:h-full sm:max-h-full sm:rounded-none sm:bg-transparent sm:shadow-none"
    >
      <div className="flex flex-col gap-2 border-b border-white/10 px-4 pb-3 pt-4 sm:border-none sm:px-0 sm:pb-2">
        <span className="mx-auto h-1.5 w-12 rounded-full bg-white/15 sm:hidden" aria-hidden="true" />
        <h2 id={headingId} className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
          Applications
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-8 pt-2 sm:px-0">
        <nav aria-label="Kali application categories" className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:max-w-none">
          <ul className="space-y-2">
            {KALI_CATEGORIES.map((category, index) => {
              const isExpanded = expandedCategory === category.id;
              const isActive = category.id === activeCategory;
              const headerId = `${category.id}-accordion-trigger`;
              const panelId = `${category.id}-accordion-panel`;
              const description = CATEGORY_DESCRIPTIONS[category.id] ?? DESCRIPTION_FALLBACK;

              return (
                <li
                  key={category.id}
                  className="rounded-xl border border-white/5 bg-white/5 shadow-sm transition focus-within:border-sky-400/60 focus-within:shadow-sky-500/10"
                >
                  <button
                    ref={(node) => {
                      headerRefs.current[index] = node;
                    }}
                    id={headerId}
                    type="button"
                    onClick={() => handleToggleCategory(category.id)}
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    aria-controls={panelId}
                    aria-expanded={isExpanded}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isActive ? 'bg-sky-500/20 text-white ring-1 ring-sky-500/30' : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <CategoryIcon categoryId={category.id} label={category.label} />
                    <span className="flex-1 text-sm font-medium">{category.label}</span>
                    <svg
                      className={`h-4 w-4 flex-shrink-0 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.188l3.71-3.96a.75.75 0 1 1 1.08 1.04l-4.24 4.53a.75.75 0 0 1-1.08 0L5.25 8.27a.75.75 0 0 1-.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    hidden={!isExpanded}
                    className="space-y-3 px-4 pb-4 pt-3 text-sm text-slate-300"
                  >
                    <p>{description}</p>
                    <button
                      type="button"
                      onClick={() => onSelect(category.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    >
                      <span>Open {category.label}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default ApplicationsMenu;
