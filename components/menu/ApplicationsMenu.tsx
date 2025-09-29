import type { CSSProperties } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useMenuNavigation } from '../../hooks/useMenuNavigation';

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

const surfaceStyle = {
  '--menu-hover-bg': 'rgba(55, 65, 81, 0.55)',
  '--menu-active-bg': 'rgb(55, 65, 81)',
  '--menu-ring-color': 'rgba(56, 189, 248, 0.85)',
} as CSSProperties;

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({ activeCategory, onSelect }) => {
  const navigation = useMenuNavigation({
    itemCount: KALI_CATEGORIES.length,
    hoverDelay: 120,
    onActivate: (index) => {
      const category = KALI_CATEGORIES[index];
      if (category) {
        onSelect(category.id);
      }
    },
  });

  const activeIndexFromCategory = useMemo(() => {
    return KALI_CATEGORIES.findIndex((category) => category.id === activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    if (activeIndexFromCategory >= 0) {
      navigation.setActiveIndex(activeIndexFromCategory);
    }
  }, [activeIndexFromCategory, navigation]);

  return (
    <nav aria-label="Kali application categories" data-menu-surface style={surfaceStyle}>
      <ul
        className="space-y-1"
        {...navigation.getListProps<HTMLUListElement>({ 'aria-label': 'Kali application categories' })}
      >
        {KALI_CATEGORIES.map((category, index) => {
          const isSelected = category.id === activeCategory;
          return (
            <li key={category.id}>
              <button
                {...navigation.getItemProps<HTMLButtonElement>(index, {
                  className: 'font-medium',
                  onClick: () => onSelect(category.id),
                  'aria-pressed': isSelected,
                })}
                ref={(node) => navigation.registerItem(index, node)}
                type="button"
                data-selected={isSelected ? 'true' : undefined}
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
