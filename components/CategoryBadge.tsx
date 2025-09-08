import React from 'react';

const categoryClasses: Record<string, string> = {
  'information-gathering':
    'bg-category-information-gathering text-gray-800 dark:bg-category-information-gathering-dark dark:text-white',
  'password-attacks':
    'bg-category-password-attacks text-gray-800 dark:bg-category-password-attacks-dark dark:text-white',
  'web-applications':
    'bg-category-web-applications text-gray-800 dark:bg-category-web-applications-dark dark:text-white',
};

export default function CategoryBadge({ category }: { category: string }) {
  const slug = category.toLowerCase().replace(/\s+/g, '-');
  const base = 'inline-block rounded px-2 py-1 text-xs font-semibold';
  const color = categoryClasses[slug] ||
    'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100';
  return <span className={`${base} ${color}`}>{category}</span>;
}
