import type { ReactNode } from 'react';

export interface ApplicationsMenuProps {
  /** Optional className overrides for the root container */
  className?: string;
  /** Content to render inside the categories sidebar */
  categories: ReactNode;
  /** Main pane content for the applications list */
  children: ReactNode;
}

const BASE_CLASSES =
  'absolute top-8 left-0 w-[880px] h-[520px] bg-kali-menu flex rounded-3xl border border-white/10 text-white shadow-[0_32px_120px_rgba(8,15,28,0.65)] backdrop-blur-2xl overflow-hidden';

export default function ApplicationsMenu({
  className,
  categories,
  children,
}: ApplicationsMenuProps) {
  return (
    <div className={`${BASE_CLASSES}${className ? ` ${className}` : ''}`}>
      <aside className="w-[220px] h-full border-r border-white/10 bg-white/5 flex flex-col">
        {categories}
      </aside>
      <section className="flex-1 h-full flex flex-col">
        {children}
      </section>
    </div>
  );
}
