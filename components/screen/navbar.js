import React, { useCallback, useEffect, useRef, useState } from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';

const APPLICATIONS_MENU = 'applications';
const STATUS_MENU = 'status';

const Navbar = () => {
  const [openMenu, setOpenMenu] = useState(null);
  const whiskerMenuRef = useRef(null);
  const focusRequestRef = useRef(null);

  const handleApplicationsOpenChange = useCallback((nextOpen) => {
    if (nextOpen) {
      focusRequestRef.current = 'search';
    }
    setOpenMenu((current) => {
      if (nextOpen) {
        return APPLICATIONS_MENU;
      }
      return current === APPLICATIONS_MENU ? null : current;
    });
  }, []);

  const toggleStatusMenu = useCallback(() => {
    setOpenMenu((current) => (current === STATUS_MENU ? null : STATUS_MENU));
  }, []);

  useEffect(() => {
    if (openMenu === APPLICATIONS_MENU && focusRequestRef.current) {
      const focusTarget = focusRequestRef.current;
      focusRequestRef.current = null;
      requestAnimationFrame(() => {
        if (focusTarget === 'search') {
          whiskerMenuRef.current?.focusSearch?.();
        } else if (focusTarget === 'trigger') {
          whiskerMenuRef.current?.focusTrigger?.();
        }
      });
    }
  }, [openMenu]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isAltF1 = event.altKey && !event.ctrlKey && !event.shiftKey && event.key === 'F1';
      const isAltF2 = event.altKey && !event.ctrlKey && !event.shiftKey && event.key === 'F2';
      const isMeta = event.key === 'Meta' && !event.ctrlKey && !event.shiftKey && !event.altKey;

      if (isAltF1 || isMeta) {
        event.preventDefault();
        event.stopPropagation();
        if (openMenu === APPLICATIONS_MENU) {
          focusRequestRef.current = null;
          setOpenMenu(null);
        } else {
          focusRequestRef.current = 'search';
          setOpenMenu(APPLICATIONS_MENU);
        }
        return;
      }

      if (isAltF2) {
        event.preventDefault();
        event.stopPropagation();
        if (openMenu !== APPLICATIONS_MENU) {
          focusRequestRef.current = 'search';
          setOpenMenu(APPLICATIONS_MENU);
        } else {
          requestAnimationFrame(() => {
            whiskerMenuRef.current?.focusSearch?.();
          });
        }
        return;
      }

      if (event.key === 'Escape') {
        if (openMenu) {
          event.preventDefault();
          event.stopPropagation();
          if (openMenu === APPLICATIONS_MENU) {
            requestAnimationFrame(() => {
              whiskerMenuRef.current?.focusTrigger?.();
            });
          }
          focusRequestRef.current = null;
          setOpenMenu(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openMenu]);

  return (
    <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
      <div className="flex items-center">
        <WhiskerMenu
          ref={whiskerMenuRef}
          isOpen={openMenu === APPLICATIONS_MENU}
          onOpenChange={handleApplicationsOpenChange}
        />
        <PerformanceGraph />
      </div>
      <div className="pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1">
        <Clock />
      </div>
      <button
        type="button"
        id="status-bar"
        aria-label="System status"
        aria-expanded={openMenu === STATUS_MENU}
        onClick={toggleStatusMenu}
        className="relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1"
      >
        <Status />
        <QuickSettings open={openMenu === STATUS_MENU} />
      </button>
    </div>
  );
};

export default Navbar;
