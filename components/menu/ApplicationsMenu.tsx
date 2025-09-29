import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const categoryIds = useMemo(() => KALI_CATEGORIES.map((category) => category.id), []);
  const [focusedIndex, setFocusedIndex] = useState(() => {
    const initialIndex = categoryIds.indexOf(activeCategory);
    return initialIndex >= 0 ? initialIndex : 0;
  });
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const activeIndex = categoryIds.indexOf(activeCategory);
    if (activeIndex >= 0) {
      setFocusedIndex(activeIndex);
      if (document.activeElement && buttonRefs.current.includes(document.activeElement as HTMLButtonElement)) {
        buttonRefs.current[activeIndex]?.focus();
      }
    }
  }, [activeCategory, categoryIds]);

  const moveFocus = (nextIndex: number) => {
    const clampedIndex = (nextIndex + KALI_CATEGORIES.length) % KALI_CATEGORIES.length;
    setFocusedIndex(clampedIndex);
    const nextCategory = KALI_CATEGORIES[clampedIndex];
    onSelect(nextCategory.id);
    buttonRefs.current[clampedIndex]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus(currentIndex - 1);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        moveFocus(currentIndex + 1);
        break;
      case 'Home':
        event.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        event.preventDefault();
        moveFocus(KALI_CATEGORIES.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <nav aria-label="Kali application categories">
      <ul className="space-y-1">
        {KALI_CATEGORIES.map((category, index) => {
          const isActive = category.id === activeCategory;
          const isFocused = index === focusedIndex;
          return (
            <li key={category.id}>
              <button
                ref={(element) => {
                  buttonRefs.current[index] = element;
                }}
                type="button"
                tabIndex={isFocused ? 0 : -1}
                onFocus={() => setFocusedIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onClick={() => {
                  setFocusedIndex(index);
                  onSelect(category.id);
                }}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue ${
                  isActive ? 'bg-gray-700 text-white' : 'bg-transparent hover:bg-gray-700/60'
                }`}
                aria-pressed={isActive}
                aria-current={isActive ? 'true' : undefined}
              >
                <CategoryIcon categoryId={category.id} label={category.label} />
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default ApplicationsMenu;
