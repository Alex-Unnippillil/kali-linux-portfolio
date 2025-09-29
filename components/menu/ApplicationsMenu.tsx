import React from 'react';

import { Icon, type IconName } from '../ui/Icon';

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

const DEFAULT_CATEGORY_ICON: IconName = 'preferences-system-symbolic';

const CATEGORY_ICON_LOOKUP: Partial<Record<string, IconName>> = {
  'information-gathering': 'information-gathering',
  'vulnerability-analysis': 'vulnerability-analysis',
  'web-application-analysis': 'web-application-analysis',
  'database-assessment': 'database-assessment',
  'password-attacks': 'password-attacks',
  'wireless-attacks': 'wireless-attacks',
  'reverse-engineering': 'reverse-engineering',
  'exploitation-tools': 'exploitation-tools',
  'sniffing-spoofing': 'sniffing-spoofing',
  'sniffing-and-spoofing': 'sniffing-spoofing',
  'post-exploitation': 'post-exploitation',
  'maintaining-access': 'post-exploitation',
  forensics: 'forensics',
  reporting: 'reporting',
  'reporting-tools': 'reporting',
  'social-engineering': 'social-engineering',
  'social-engineering-tools': 'social-engineering',
  'hardware-hacking': 'hardware-hacking',
  extra: 'extra',
  miscellaneous: 'extra',
  top10: 'top10',
  'top-10-tools': 'top10',
  'stress-testing': 'exploitation-tools',
};

type CategoryIconProps = {
  categoryId: string;
  label: string;
};

const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, label }) => {
  const iconName = CATEGORY_ICON_LOOKUP[categoryId] ?? DEFAULT_CATEGORY_ICON;
  return <Icon name={iconName} label={`${label} category icon`} size={20} className="h-5 w-5 flex-shrink-0" />;
};

type ApplicationsMenuProps = {
  activeCategory: string;
  onSelect: (id: string) => void;
};

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({ activeCategory, onSelect }) => {
  return (
    <nav aria-label="Kali application categories">
      <ul className="space-y-1">
        {KALI_CATEGORIES.map((category) => {
          const isActive = category.id === activeCategory;
          return (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onSelect(category.id)}
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
        })}
      </ul>
    </nav>
  );
};

export default ApplicationsMenu;
