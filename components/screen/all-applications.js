import React, { useEffect } from 'react';
import AppGrid from '../apps/app-grid';

export default function AllApplications({ openApp, onClose }) {
  const focusSidebar = () => {
    const first = document.querySelector('nav[aria-label="Dock"] [role="menuitem"]');
    if (first && first instanceof HTMLElement) first.focus();
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
      <AppGrid openApp={openApp} onFocusSidebar={focusSidebar} />
    </div>
  );
}
