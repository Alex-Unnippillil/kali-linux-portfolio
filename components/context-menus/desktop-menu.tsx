import React, { useEffect, useMemo, useState } from 'react';
import logger from '../../utils/logger';
import {
  type DesktopMenuContext,
  type IconSizePreset,
  useContextMenuItems,
} from './registry';

interface DesktopMenuProps {
  active: boolean;
  openApp: (id: string) => void;
  addNewFolder?: () => void;
  openShortcutSelector?: () => void;
  iconSizePreset?: IconSizePreset;
  setIconSizePreset?: (value: IconSizePreset) => void;
  clearSession?: () => void;
  requestClose?: () => void;
}

const iconSizeOptions: Array<{ value: IconSizePreset; label: string }> = [
  { value: 'small', label: 'Small Icons' },
  { value: 'medium', label: 'Medium Icons' },
  { value: 'large', label: 'Large Icons' },
];

const noopSetIconSizePreset: (value: IconSizePreset) => void = () => undefined;

function Divider() {
  return (
    <div className="flex justify-center w-full">
      <div className=" border-t border-gray-900 py-1 w-2/5"></div>
    </div>
  );
}

const DesktopMenu: React.FC<DesktopMenuProps> = ({
  active,
  openApp,
  addNewFolder,
  openShortcutSelector,
  iconSizePreset = 'medium',
  setIconSizePreset = noopSetIconSizePreset,
  clearSession,
  requestClose,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const checkFullScreen = () => {
      setIsFullScreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', checkFullScreen);
    checkFullScreen();
    return () => {
      document.removeEventListener('fullscreenchange', checkFullScreen);
    };
  }, []);

  const context = useMemo<DesktopMenuContext>(
    () => ({
      active,
      addNewFolder,
      openShortcutSelector,
      openApp,
      iconSizePreset,
      setIconSizePreset,
      clearSession,
      requestClose,
    }),
    [
      active,
      addNewFolder,
      openShortcutSelector,
      openApp,
      iconSizePreset,
      setIconSizePreset,
      clearSession,
      requestClose,
    ],
  );

  const registeredItems = useContextMenuItems('desktop', context, active);

  const goFullScreen = () => {
    try {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void document.documentElement.requestFullscreen();
      }
    } catch (error) {
      logger.error(error);
    }
  };

  return (
    <div
      id="desktop-menu"
      role="menu"
      aria-label="Desktop context menu"
      className={`${
        active ? ' block ' : ' hidden '
      } cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-50 text-sm`}
    >
      <button
        onClick={() => addNewFolder?.()}
        type="button"
        role="menuitem"
        aria-label="New Folder"
        className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
      >
        <span className="ml-5">New Folder</span>
      </button>
      <button
        onClick={() => openShortcutSelector?.()}
        type="button"
        role="menuitem"
        aria-label="Create Shortcut"
        className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
      >
        <span className="ml-5">Create Shortcut...</span>
      </button>
      <Divider />
      <div className="px-5 pb-1 text-xs tracking-wide uppercase text-ub-warm-grey text-opacity-80">
        View
      </div>
      {iconSizeOptions.map((option) => {
        const isActive = iconSizePreset === option.value;
        return (
          <button
            key={option.value}
            onClick={() => setIconSizePreset(option.value)}
            type="button"
            role="menuitemradio"
            aria-checked={isActive}
            className={`${
              isActive ? ' text-ubt-blue ' : ''
            } group w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 flex items-center justify-between`}
          >
            <span className="ml-5">{option.label}</span>
            <span
              aria-hidden="true"
              className={`${
                isActive
                  ? ' opacity-100 '
                  : ' opacity-0 group-hover:opacity-60 group-focus-visible:opacity-60 '
              } mr-5 text-xs transition-opacity`}
            >
              ✓
            </span>
          </button>
        );
      })}
      <Divider />
      <div
        role="menuitem"
        aria-label="Paste"
        aria-disabled="true"
        className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400"
      >
        <span className="ml-5">Paste</span>
      </div>
      <Divider />
      <div
        role="menuitem"
        aria-label="Show Desktop in Files"
        aria-disabled="true"
        className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400"
      >
        <span className="ml-5">Show Desktop in Files</span>
      </div>
      <button
        onClick={() => openApp('terminal')}
        type="button"
        role="menuitem"
        aria-label="Open in Terminal"
        className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
      >
        <span className="ml-5">Open in Terminal</span>
      </button>
      <Divider />
      <button
        onClick={() => openApp('settings')}
        type="button"
        role="menuitem"
        aria-label="Change Background"
        className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
      >
        <span className="ml-5">Change Background...</span>
      </button>
      <Divider />
      <div
        role="menuitem"
        aria-label="Display Settings"
        aria-disabled="true"
        className="w-full py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5 text-gray-400"
      >
        <span className="ml-5">Display Settings</span>
      </div>
      <button
        onClick={() => openApp('settings')}
        type="button"
        role="menuitem"
        aria-label="Settings"
        className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
      >
        <span className="ml-5">Settings</span>
      </button>
      <Divider />
      <button
        onClick={goFullScreen}
        type="button"
        role="menuitem"
        aria-label={isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
        className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
      >
        <span className="ml-5">{isFullScreen ? 'Exit' : 'Enter'} Full Screen</span>
      </button>
      {registeredItems.length > 0 ? (
        <>
          <Divider />
          {registeredItems.map((item) => (
            <React.Fragment key={item.id}>{item.render(context)}</React.Fragment>
          ))}
        </>
      ) : null}
      <Divider />
      <button
        onClick={() => {
          clearSession?.();
          requestClose?.();
        }}
        type="button"
        role="menuitem"
        aria-label="Clear Session"
        className="w-full text-left py-0.5 hover:bg-ub-warm-grey hover:bg-opacity-20 mb-1.5"
      >
        <span className="ml-5">Clear Session</span>
      </button>
    </div>
  );
};

export default DesktopMenu;
