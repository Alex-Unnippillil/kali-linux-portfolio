'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import type { ReactNode } from 'react';

export type TopTab = {
  /**
   * Route segment that activates this tab. Use `null` for the default segment.
   */
  id: string | null;
  /**
   * Link destination for the tab.
   */
  href: string;
  /**
   * Visible label or content rendered inside the tab link.
   */
  label: ReactNode;
  /**
   * Optional additional classes scoped to this tab.
   */
  className?: string;
};

export interface TopTabsProps {
  /**
   * Collection of tabs to render across the top navigation.
   */
  tabs: readonly TopTab[];
  /**
   * Optional class names applied to the tabs container.
   */
  className?: string;
  /**
   * Classes shared by every tab instance.
   */
  tabClassName?: string;
}

export default function TopTabs({
  tabs,
  className = '',
  tabClassName = '',
}: TopTabsProps) {
  const selectedSegment = useSelectedLayoutSegment();

  return (
    <nav className={className || undefined} aria-label="Top tabs">
      {tabs.map((tab) => {
        const isActive = selectedSegment === tab.id;
        const key = tab.id ?? tab.href;
        const combinedClassName = [
          tabClassName,
          tab.className,
          isActive ? 'active' : '',
        ]
          .filter(Boolean)
          .join(' ')
          .trim();

        return (
          <Link
            key={key}
            href={tab.href}
            className={combinedClassName || undefined}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
