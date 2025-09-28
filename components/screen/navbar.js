import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import PowerMenu from '../ui/PowerMenu';
import ConfirmDialog from '../ui/ConfirmDialog';

const ACTION_COPY = {
  lock: {
    title: 'Lock the screen?',
    description: 'All open windows remain in place and the lock screen appears until you return.',
    confirmLabel: 'Lock',
  },
  logout: {
    title: 'Log out of the session?',
    description: 'This returns to the lock screen and clears transient desktop state.',
    confirmLabel: 'Log out',
  },
  restart: {
    title: 'Restart the desktop?',
    description: 'Open windows will close and the boot splash will replay before returning to the desktop.',
    confirmLabel: 'Restart',
  },
  reset: {
    title: 'Reset the interface?',
    description: 'Clears personalised UI settings and reloads the page to restore defaults.',
    confirmLabel: 'Reset UI',
  },
};

const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true';

export default function Navbar({
  lockScreen,
  restart,
  resetUI,
}) {
  /** @type {[import('../ui/PowerMenu').PowerAction | null, React.Dispatch<React.SetStateAction<import('../ui/PowerMenu').PowerAction | null>>]} */
  const [pendingAction, setPendingAction] = useState(null);
  const [statusCard, setStatusCard] = useState(false);
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);

  /** @type {React.MutableRefObject<HTMLButtonElement | null>} */
  const powerButtonRef = useRef(null);

  const focusPowerButton = useCallback(() => {
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        powerButtonRef.current?.focus();
      });
    } else {
      powerButtonRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (powerMenuOpen) {
      setStatusCard(false);
    }
  }, [powerMenuOpen]);

  const disabledActions = useMemo(() => {
    if (!isStaticExport) return {};
    return {
      restart: 'Restart is disabled in static export builds.',
    };
  }, [isStaticExport]);

  const closePowerMenu = useCallback(() => {
    setPowerMenuOpen(false);
    focusPowerButton();
  }, [focusPowerButton]);

  const toggleStatusCard = useCallback(() => {
    setPowerMenuOpen(false);
    setStatusCard(open => !open);
  }, []);

  const togglePowerMenu = useCallback(() => {
    setStatusCard(false);
    setPowerMenuOpen(open => !open);
  }, []);

  const handleSelectAction = useCallback(
    /** @param {import('../ui/PowerMenu').PowerAction} action */ (action) => {
      setPowerMenuOpen(false);
      setPendingAction(action);
    },
    []
  );

  const handleCancel = useCallback(() => {
    setPendingAction(null);
    focusPowerButton();
  }, [focusPowerButton]);

  const handleConfirm = useCallback(() => {
    if (!pendingAction) return;
    switch (pendingAction) {
      case 'lock':
      case 'logout':
        lockScreen?.();
        break;
      case 'restart':
        restart?.();
        break;
      case 'reset':
        resetUI?.();
        break;
      default:
        break;
    }
    setPendingAction(null);
    focusPowerButton();
  }, [focusPowerButton, lockScreen, pendingAction, restart, resetUI]);

  const confirmCopy = pendingAction ? ACTION_COPY[pendingAction] : null;

  return (
    <div className="main-navbar-vp absolute top-0 right-0 z-50 flex w-screen flex-nowrap select-none items-center justify-between bg-ub-grey text-sm text-ubt-grey shadow-md">
      <div className="flex items-center">
        <WhiskerMenu />
        <PerformanceGraph />
      </div>
      <div className="py-1 pl-2 pr-2 text-xs outline-none transition duration-100 ease-in-out md:text-sm">
        <Clock />
      </div>
      <div className="flex items-center">
        <button
          type="button"
          id="status-bar"
          aria-label="System status"
          onClick={toggleStatusCard}
          className="relative border-b-2 border-transparent py-1 pl-3 pr-3 outline-none transition duration-100 ease-in-out focus:border-ubb-orange"
        >
          <Status />
          <QuickSettings open={statusCard} />
        </button>
        <button
          type="button"
          ref={powerButtonRef}
          aria-haspopup="menu"
          aria-expanded={powerMenuOpen}
          aria-controls="power-menu"
          onClick={togglePowerMenu}
          className="relative ml-1 flex items-center rounded-md py-1 pl-3 pr-3 text-sm text-white transition duration-100 ease-in-out hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-ub-orange"
        >
          <Image src="/themes/Yaru/status/system-shutdown-symbolic.svg" alt="Power options" width={16} height={16} className="mr-2" />
          Power
        </button>
        <PowerMenu
          open={powerMenuOpen}
          onClose={closePowerMenu}
          onSelect={handleSelectAction}
          triggerRef={powerButtonRef}
          disabledActions={disabledActions}
        />
      </div>
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={confirmCopy?.title ?? ''}
        description={confirmCopy?.description ?? ''}
        confirmLabel={confirmCopy?.confirmLabel ?? ''}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
