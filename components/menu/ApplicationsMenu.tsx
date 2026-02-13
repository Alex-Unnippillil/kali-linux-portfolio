import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

type CategoryGroup = {
  id: string;
  title: string;
  description?: string;
  categories: string[];
};

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: 'recon-analysis',
    title: 'Recon & Analysis',
    description: 'Discovery tooling for mapping targets and assessing risk.',
    categories: [
      'information-gathering',
      'vulnerability-analysis',
      'web-application-analysis',
      'database-assessment',
    ],
  },
  {
    id: 'attack-exploit',
    title: 'Attack & Exploit',
    description: "Offensive simulations that mirror Kali's attack surface.",
    categories: [
      'password-attacks',
      'wireless-attacks',
      'reverse-engineering',
      'exploitation-tools',
      'sniffing-spoofing',
      'post-exploitation',
      'social-engineering',
      'hardware-hacking',
    ],
  },
  {
    id: 'ops-support',
    title: 'Ops & Support',
    description: 'Tools for reporting, forensics, and curated extras.',
    categories: [
      'forensics',
      'reporting',
      'extra',
      'top10',
    ],
  },
];

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    return CATEGORY_GROUPS.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.id] = true;
      return acc;
    }, {});
  });
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number | null>(null);
  const previousBodyOverflow = useRef<string | null>(null);

  const categoryMap = useMemo(() => {
    return new Map(KALI_CATEGORIES.map((category) => [category.id, category] as const));
  }, []);

  useEffect(() => {
    if (sheetOpen) {
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setSheetOpen(false);
        }
      };
      document.addEventListener('keydown', handleKey);
      previousBodyOverflow.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleKey);
        document.body.style.overflow = previousBodyOverflow.current ?? '';
      };
    }

    document.body.style.overflow = previousBodyOverflow.current ?? '';
    return undefined;
  }, [sheetOpen]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((current) => ({
      ...current,
      [groupId]: !current[groupId],
    }));
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const handleSelect = useCallback(
    (categoryId: string) => {
      onSelect(categoryId);
      closeSheet();
    },
    [closeSheet, onSelect],
  );

  const resetDragStyles = useCallback(() => {
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transition = 'transform 0.2s ease-out';
      sheet.style.transform = 'translateY(0)';
      const timer = window.setTimeout(() => {
        if (sheet) {
          sheet.style.transition = '';
        }
      }, 200);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    dragStartY.current = event.touches[0]?.clientY ?? null;
    dragCurrentY.current = dragStartY.current;
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.transition = '';
    }
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) {
      return;
    }
    const currentY = event.touches[0]?.clientY ?? dragStartY.current;
    dragCurrentY.current = currentY;
    const delta = currentY - dragStartY.current;
    if (delta > 0) {
      const sheet = sheetRef.current;
      if (sheet) {
        sheet.style.transform = `translateY(${delta}px)`;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStartY.current === null || dragCurrentY.current === null) {
      return;
    }
    const delta = dragCurrentY.current - dragStartY.current;
    dragStartY.current = null;
    dragCurrentY.current = null;
    if (delta > 120) {
      closeSheet();
      return;
    }
    resetDragStyles();
  }, [closeSheet, resetDragStyles]);

  const renderCategoryButton = useCallback(
    (categoryId: string) => {
      const category = categoryMap.get(categoryId);
      if (!category) {
        return null;
      }
      const isActive = category.id === activeCategory;
      return (
        <li key={category.id}>
          <button
            type="button"
            onClick={() => handleSelect(category.id)}
            className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
              isActive ? 'bg-gray-700 text-white' : 'bg-transparent hover:bg-gray-700/60'
            }`}
            aria-pressed={isActive}
          >
            <CategoryIcon categoryId={category.id} label={category.label} />
            <span className="text-sm font-medium">{category.label}</span>
          </button>
        </li>
      );
    },
    [activeCategory, categoryMap, handleSelect],
  );

  const renderGroup = useCallback(
    (group: CategoryGroup) => {
      const isExpanded = expandedGroups[group.id];
      const resolvedCategories = group.categories
        .map((categoryId) => categoryMap.get(categoryId))
        .filter((category): category is KaliCategory => Boolean(category));

      if (resolvedCategories.length === 0) {
        return null;
      }

      return (
        <section
          key={group.id}
          className="rounded-lg border border-white/10 bg-black/40 backdrop-blur"
        >
          <button
            type="button"
            onClick={() => toggleGroup(group.id)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-expanded={isExpanded}
          >
            <div>
              <p className="text-sm font-semibold text-white">{group.title}</p>
              {group.description ? (
                <p className="text-xs text-gray-300">{group.description}</p>
              ) : null}
            </div>
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-xs transition-transform ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`}
              aria-hidden="true"
            >
              ▼
            </span>
          </button>
          {isExpanded ? (
            <div
              className="max-h-72 overflow-y-auto border-t border-white/5 px-1 pb-3"
              style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
            >
              <ul className="space-y-1 pt-2">
                {resolvedCategories.map((category) => renderCategoryButton(category.id))}
              </ul>
            </div>
          ) : null}
        </section>
      );
    },
    [categoryMap, expandedGroups, renderCategoryButton, toggleGroup],
  );

  return (
    <div className="space-y-4">
      <div className="hidden sm:block">
        <nav aria-label="Kali application categories" className="space-y-3">
          {CATEGORY_GROUPS.map(renderGroup)}
        </nav>
      </div>

      <div className="sm:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-gray-800 px-4 py-3 text-left text-sm font-semibold text-white shadow focus:outline-none focus:ring-2 focus:ring-sky-400"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-controls="applications-menu-sheet"
        >
          Browse Categories
          <span aria-hidden="true" className="text-xs font-normal text-gray-300">
            {categoryMap.get(activeCategory)?.label ?? 'Select'}
          </span>
        </button>

        {sheetOpen ? (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="applications-menu-sheet-title"
            onClick={closeSheet}
          >
            <div className="flex-1" />
            <div
              id="applications-menu-sheet"
              ref={sheetRef}
              className="relative max-h-[85vh] w-full rounded-t-3xl border-t border-white/10 bg-gray-900 shadow-xl transition-transform"
              style={{
                WebkitOverflowScrolling: 'touch',
              }}
              onClick={(event) => event.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex items-center justify-center py-3">
                <span className="h-1.5 w-12 rounded-full bg-white/40" aria-hidden="true" />
              </div>
              <header className="px-6 pb-3">
                <h2 id="applications-menu-sheet-title" className="text-base font-semibold text-white">
                  Kali Categories
                </h2>
                <p className="text-xs text-gray-300">
                  Swipe down or tap outside to close. Sections scroll independently.
                </p>
              </header>
              <div
                className="grid gap-3 overflow-y-auto px-4 pb-6"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
              >
                {CATEGORY_GROUPS.map(renderGroup)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ApplicationsMenu;
