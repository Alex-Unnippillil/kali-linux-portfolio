import React from 'react';
import Image from 'next/image';
import clsx from 'clsx';

type Section = {
  id: string;
  label: string;
  icon: string;
  alt: string;
};

type SidebarProps = {
  sections: Section[];
  activeId: string;
  onChange: (id: string) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
};

const Sidebar: React.FC<SidebarProps> = ({
  sections,
  activeId,
  onChange,
  orientation = 'vertical',
  className,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    );
    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === -1) {
      return;
    }

    const isHorizontal = orientation === 'horizontal';
    const nextKeys = isHorizontal ? ['ArrowRight', 'ArrowDown'] : ['ArrowDown', 'ArrowRight'];
    const previousKeys = isHorizontal ? ['ArrowLeft', 'ArrowUp'] : ['ArrowUp', 'ArrowLeft'];

    if (nextKeys.includes(event.key)) {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      tabs[nextIndex]?.focus();
    } else if (previousKeys.includes(event.key)) {
      event.preventDefault();
      const previousIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      tabs[previousIndex]?.focus();
    }
  };

  const containerClasses = clsx(
    orientation === 'horizontal' ? 'flex flex-wrap gap-2' : 'flex flex-col',
    className
  );

  return (
    <div className={containerClasses} role="tablist" aria-orientation={orientation} onKeyDown={handleKeyDown}>
      {sections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(section.id)}
            onFocus={() => {
              if (!isActive) {
                onChange(section.id);
              }
            }}
            className={clsx(
              'flex items-center gap-2 rounded-sm border border-transparent text-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue',
              orientation === 'horizontal'
                ? 'flex-1 min-w-[120px] justify-center px-3 py-2'
                : 'w-full justify-start px-2 py-2',
              isActive
                ? 'bg-ub-gedit-light bg-opacity-100 hover:bg-opacity-95'
                : 'hover:bg-white/10'
            )}
          >
            <Image
              className="w-4 h-4 rounded border border-gray-600"
              alt={section.alt}
              src={section.icon}
              width={16}
              height={16}
              sizes="16px"
            />
            <span className="text-sm font-medium leading-none">{section.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default Sidebar;
