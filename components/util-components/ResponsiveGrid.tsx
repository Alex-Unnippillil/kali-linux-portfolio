import React, { useRef } from 'react';

interface ResponsiveGridProps {
  children: React.ReactNode;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>('[data-grid-item]');
    if (items.length === 0) return;
    const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);
    const columns = getComputedStyle(container).gridTemplateColumns.split(' ').length;
    let nextIndex = currentIndex;
    switch (e.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'ArrowDown':
        nextIndex = (currentIndex + columns) % items.length;
        break;
      case 'ArrowUp':
        nextIndex = (currentIndex - columns + items.length) % items.length;
        break;
      default:
        return;
    }
    e.preventDefault();
    items[nextIndex].focus();
  };

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center"
      onKeyDown={handleKeyDown}
    >
      {React.Children.map(children, (child, index) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement, {
              tabIndex: index === 0 ? 0 : -1,
              'data-grid-item': true,
            })
          : child
      )}
    </div>
  );
};

export default ResponsiveGrid;
