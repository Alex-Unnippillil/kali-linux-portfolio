import React, { useState, useEffect, useRef } from 'react';

const HelpMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !btnRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const showTour = () => {
    window.dispatchEvent(new CustomEvent('show-welcome-tour'));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        Help
      </button>
      {open && (
          <div
            ref={menuRef}
            className="absolute left-0 mt-1 z-50 bg-ub-grey text-white shadow-lg p-2 rtl:left-auto rtl:right-0"
            tabIndex={-1}
          >
            <button
              type="button"
              className="block px-2 py-1 text-left hover:underline rtl:text-right"
              onClick={showTour}
            >
            Show Welcome Tour
          </button>
        </div>
      )}
    </div>
  );
};

export default HelpMenu;

