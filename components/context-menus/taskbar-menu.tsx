import React, { useMemo, useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import {
  type TaskbarMenuContext,
  useContextMenuItems,
} from './registry';

interface TaskbarMenuProps extends TaskbarMenuContext {}

function Divider() {
  return (
    <div className="flex justify-center w-full">
      <div className=" border-t border-gray-900 py-1 w-2/5"></div>
    </div>
  );
}

const TaskbarMenu: React.FC<TaskbarMenuProps> = ({
  active,
  onCloseMenu,
  onClose,
  onMinimize,
  minimized,
}) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(menuRef, active);
  useRovingTabIndex(menuRef, active, 'vertical');

  const context = useMemo<TaskbarMenuContext>(
    () => ({ active, onCloseMenu, onClose, onMinimize, minimized }),
    [active, onCloseMenu, onClose, onMinimize, minimized],
  );

  const registeredItems = useContextMenuItems('taskbar', context, active);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onCloseMenu?.();
    }
  };

  const handleMinimize = () => {
    onMinimize?.();
    onCloseMenu?.();
  };

  const handleClose = () => {
    onClose?.();
    onCloseMenu?.();
  };

  return (
    <div
      id="taskbar-menu"
      role="menu"
      aria-hidden={!active}
      ref={menuRef}
      onKeyDown={handleKeyDown}
      className={`${
        active ? ' block ' : ' hidden '
      } cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm`}
    >
      <button
        type="button"
        onClick={handleMinimize}
        role="menuitem"
        aria-label={minimized ? 'Restore Window' : 'Minimize Window'}
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">{minimized ? 'Restore' : 'Minimize'}</span>
      </button>
      <button
        type="button"
        onClick={handleClose}
        role="menuitem"
        aria-label="Close Window"
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Close</span>
      </button>
      {registeredItems.length > 0 ? (
        <>
          <Divider />
          {registeredItems.map((item) => (
            <React.Fragment key={item.id}>{item.render(context)}</React.Fragment>
          ))}
        </>
      ) : null}
    </div>
  );
};

export default TaskbarMenu;
