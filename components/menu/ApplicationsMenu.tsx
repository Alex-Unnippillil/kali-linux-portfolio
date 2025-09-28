'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import Image from 'next/image';

import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

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
  forensics: '/themes/kali/categories/forensics.svg',
  reporting: '/themes/kali/categories/reporting.svg',
  'reporting-tools': '/themes/kali/categories/reporting.svg',
  'social-engineering': '/themes/kali/categories/social-engineering.svg',
  'social-engineering-tools': '/themes/kali/categories/social-engineering.svg',
  'hardware-hacking': '/themes/kali/categories/hardware-hacking.svg',
  extra: '/themes/kali/categories/extra.svg',
  miscellaneous: '/themes/kali/categories/extra.svg',
  top10: '/themes/kali/categories/top10.svg',
  'top-10-tools': '/themes/kali/categories/top10.svg',
  'stress-testing': '/themes/kali/categories/exploitation-tools.svg',
};

type MenuGroupConfig =
  | {
      id: 'all';
      label: string;
      icon: string;
      description: string;
      type: 'all';
    }
  | {
      id: 'favorites';
      label: string;
      icon: string;
      description: string;
      type: 'favorites';
    }
  | {
      id: 'recent';
      label: string;
      icon: string;
      description: string;
      type: 'recent';
    }
  | {
      id: string;
      label: string;
      icon: string;
      description: string;
      type: 'category';
      appIds: readonly string[];
    };

const MENU_GROUPS: readonly MenuGroupConfig[] = [
  {
    id: 'all',
    label: 'All Applications',
    icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
    description: 'Browse every desktop app, utility, and simulation included in the portfolio.',
    type: 'all',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: '/themes/Yaru/status/projects.svg',
    description: 'Pinned apps and tools you marked as favorites for quick access.',
    type: 'favorites',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: '/themes/Yaru/status/process-working-symbolic.svg',
    description: 'The most recently launched windows so you can jump back into a workflow.',
    type: 'recent',
  },
  {
    id: 'information-gathering',
    label: 'Information Gathering',
    icon: '/themes/Yaru/apps/radar-symbolic.svg',
    description: 'Reconnaissance and footprinting simulations covering network discovery and OSINT.',
    type: 'category',
    appIds: ['nmap-nse', 'reconng', 'kismet', 'wireshark'],
  },
  {
    id: 'vulnerability-analysis',
    label: 'Vulnerability Analysis',
    icon: '/themes/Yaru/apps/nessus.svg',
    description: 'Scan and triage hosts with guided versions of common vulnerability assessment suites.',
    type: 'category',
    appIds: ['nessus', 'openvas', 'nikto'],
  },
  {
    id: 'web-app-analysis',
    label: 'Web App Analysis',
    icon: '/themes/Yaru/apps/http.svg',
    description: 'Targeted tooling that walks through HTTP and browser-based attack surfaces.',
    type: 'category',
    appIds: ['http', 'beef', 'metasploit'],
  },
  {
    id: 'password-attacks',
    label: 'Password Attacks',
    icon: '/themes/Yaru/apps/john.svg',
    description: 'Cracking labs that demonstrate dictionary, brute-force, and hybrid password attacks.',
    type: 'category',
    appIds: ['john', 'hashcat', 'hydra'],
  },
  {
    id: 'wireless-attacks',
    label: 'Wireless Attacks',
    icon: '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg',
    description: '802.11 capture and replay exercises focused on Wi-Fi auditing and packet inspection.',
    type: 'category',
    appIds: ['kismet', 'reaver', 'wireshark'],
  },
  {
    id: 'exploitation-tools',
    label: 'Exploitation Tools',
    icon: '/themes/Yaru/apps/metasploit.svg',
    description: 'Post-exploit playbooks and exploit frameworks adapted for safe, offline demos.',
    type: 'category',
    appIds: ['metasploit', 'security-tools', 'beef'],
  },
  {
    id: 'sniffing-spoofing',
    label: 'Sniffing & Spoofing',
    icon: '/themes/Yaru/apps/ettercap.svg',
    description: 'Traffic capture and manipulation utilities to explain man-in-the-middle techniques.',
    type: 'category',
    appIds: ['dsniff', 'ettercap', 'wireshark'],
  },
  {
    id: 'post-exploitation',
    label: 'Post Exploitation',
    icon: '/themes/Yaru/apps/msf-post.svg',
    description: 'Pivoting and persistence scenarios that highlight privilege escalation and staging.',
    type: 'category',
    appIds: ['msf-post', 'mimikatz', 'volatility'],
  },
  {
    id: 'forensics-reporting',
    label: 'Forensics & Reporting',
    icon: '/themes/Yaru/apps/autopsy.svg',
    description: 'Digital forensics labs and reporting aides for compiling incident response findings.',
    type: 'category',
    appIds: ['autopsy', 'evidence-vault', 'project-gallery'],
  },
];

const DEFAULT_GROUP = MENU_GROUPS[0];

type ApplicationsMenuProps = {
  anchorRef?: RefObject<HTMLElement>;
};

type OpenStateListener = (open: boolean) => void;

const stateListeners = new Set<Dispatch<SetStateAction<boolean>>>();
const effectListeners = new Set<OpenStateListener>();
let currentOpenState = false;

function updateOpenState(action: SetStateAction<boolean>) {
  const nextState = typeof action === 'function' ? action(currentOpenState) : action;
  currentOpenState = nextState;
  stateListeners.forEach((listener) => {
    listener(nextState);
  });
  effectListeners.forEach((listener) => {
    listener(nextState);
  });
}

export function registerApplicationsMenuHost(listener: Dispatch<SetStateAction<boolean>>) {
  stateListeners.add(listener);
  listener(currentOpenState);
  return () => {
    stateListeners.delete(listener);
  };
}

export function subscribeToApplicationsMenu(listener: OpenStateListener) {
  effectListeners.add(listener);
  listener(currentOpenState);
  return () => {
    effectListeners.delete(listener);
  };
}

export function openApplicationsMenu() {
  updateOpenState(true);
}

export function closeApplicationsMenu() {
  updateOpenState(false);
}

export function toggleApplicationsMenu() {
  updateOpenState((prev) => !prev);
}

const readRecentAppIds = (): string[] => {
  try {
    const stored = safeLocalStorage?.getItem('recentApps');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch (error) {
    console.warn('Unable to read recent applications from storage', error);
    return [];
  }
};

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

type ResolveContext = {
  allApps: AppMeta[];
  favouriteApps: AppMeta[];
  recentApps: AppMeta[];
  appMap: Map<string, AppMeta>;
};

const resolveGroupApps = (group: MenuGroupConfig, context: ResolveContext) => {
  switch (group.type) {
    case 'all':
      return context.allApps;
    case 'favorites':
      return context.favouriteApps;
    case 'recent':
      return context.recentApps;
    case 'category':
      return group.appIds
        .map((appId) => context.appMap.get(appId))
        .filter((app): app is AppMeta => Boolean(app));
    default:
      return [];
  }
};

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({ anchorRef }) => {
  const [isOpen, setIsOpen] = useState(currentOpenState);
  const [activeGroupId, setActiveGroupId] = useState<MenuGroupConfig['id']>(DEFAULT_GROUP.id);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => registerApplicationsMenuHost(setIsOpen), []);

  const allApps = useMemo(() => apps as AppMeta[], []);
  const favouriteApps = useMemo(() => allApps.filter((app) => app.favourite), [allApps]);
  const appMap = useMemo(() => new Map(allApps.map((app) => [app.id, app])), [allApps]);
  const recentApps = useMemo(() => {
    const mapped = recentIds
      .map((appId) => appMap.get(appId))
      .filter((app): app is AppMeta => Boolean(app));
    return mapped;
  }, [appMap, recentIds]);

  const resolveContext = useMemo<ResolveContext>(
    () => ({ allApps, favouriteApps, recentApps, appMap }),
    [allApps, favouriteApps, recentApps, appMap],
  );

  const groupLookup = useMemo(() => new Map(MENU_GROUPS.map((group) => [group.id, group] as const)), []);
  const activeGroup = groupLookup.get(activeGroupId) ?? DEFAULT_GROUP;
  const activeApps = useMemo(() => resolveGroupApps(activeGroup, resolveContext), [activeGroup, resolveContext]);

  useEffect(() => {
    if (!isOpen) return;
    setRecentIds(readRecentAppIds());
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Meta' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        toggleApplicationsMenu();
        return;
      }
      if (!isOpen) return;
      if (event.key === 'Escape') {
        closeApplicationsMenu();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target)) return;
      if (anchorRef?.current && anchorRef.current.contains(target)) return;
      closeApplicationsMenu();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [anchorRef, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setActiveGroupId(DEFAULT_GROUP.id);
    }
  }, [isOpen]);

  const openApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    closeApplicationsMenu();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute left-0 top-full mt-2 flex w-[640px] origin-top-left overflow-hidden rounded-lg border border-black/40 bg-ub-grey text-white shadow-2xl"
      role="dialog"
      aria-label="Applications menu"
    >
      <aside className="flex w-64 flex-col gap-1 bg-gray-900/90 p-3">
        <h2 className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Categories</h2>
        <nav aria-label="Application categories" className="mt-1 space-y-1">
          {MENU_GROUPS.map((group) => {
            const isActive = activeGroup.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-ubb-orange focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  isActive ? 'bg-gray-700/80 text-white' : 'bg-transparent text-gray-200 hover:bg-gray-700/60'
                }`}
                onClick={() => setActiveGroupId(group.id)}
              >
                <Image src={group.icon} alt="" width={20} height={20} className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 truncate">{group.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-gray-700 pt-3">
          <p className="mb-2 px-2 text-xs uppercase tracking-wide text-gray-500">Kali groups</p>
          <ul className="space-y-1 text-sm">
            {KALI_CATEGORIES.map((category) => (
              <li key={category.id} className="flex items-center gap-2 px-2 text-gray-300">
                <CategoryIcon categoryId={category.id} label={category.label} />
                <span>{category.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <section className="flex flex-1 flex-col bg-gray-900/80 p-4">
        <header className="flex items-center gap-3">
          <Image src={activeGroup.icon} alt="" width={28} height={28} className="h-7 w-7" />
          <div>
            <h3 className="text-lg font-semibold text-white">{activeGroup.label}</h3>
            <p className="text-xs text-gray-300">{activeGroup.description}</p>
          </div>
        </header>
        <div className="mt-4 grid max-h-72 grid-cols-3 gap-2 overflow-y-auto pr-2">
          {activeApps.length === 0 ? (
            <div className="col-span-3 flex h-full items-center justify-center rounded-md border border-dashed border-gray-700 bg-black/20 p-6 text-center text-sm text-gray-300">
              No applications are available for this category yet.
            </div>
          ) : (
            activeApps.map((app) => (
              <div key={app.id} className="rounded transition focus-within:ring-2 focus-within:ring-ubb-orange">
                <UbuntuApp
                  id={app.id}
                  icon={app.icon}
                  name={app.title}
                  openApp={() => openApp(app.id)}
                  disabled={app.disabled}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ApplicationsMenu;

