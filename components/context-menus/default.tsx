import React, { useMemo, useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import {
  type DefaultMenuContext,
  useContextMenuItems,
} from './registry';

interface DefaultMenuProps extends DefaultMenuContext {}

function Divider() {
  return (
    <div className="flex justify-center w-full">
      <div className=" border-t border-gray-900 py-1 w-2/5"></div>
    </div>
  );
}

const DefaultMenu: React.FC<DefaultMenuProps> = ({ active, onClose }) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  useFocusTrap(menuRef, active);
  useRovingTabIndex(menuRef, active, 'vertical');

  const context = useMemo<DefaultMenuContext>(
    () => ({ active, onClose }),
    [active, onClose],
  );

  const registeredItems = useContextMenuItems('default', context, active);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
  };

  return (
    <div
      id="default-menu"
      role="menu"
      aria-hidden={!active}
      ref={menuRef}
      onKeyDown={handleKeyDown}
      className={`${
        active ? ' block ' : ' hidden '
      } cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm`}
    >
      <Divider />
      <a
        rel="noopener noreferrer"
        href="https://www.linkedin.com/in/unnippillil/"
        target="_blank"
        role="menuitem"
        aria-label="Linkedin"
        className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">
          <strong>Linkedin</strong>
        </span>
      </a>
      <a
        rel="noopener noreferrer"
        href="https://github.com/Alex-Unnippillil"
        target="_blank"
        role="menuitem"
        aria-label="Github"
        className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">
          <strong>Github</strong>
        </span>
      </a>
      <a
        rel="noopener noreferrer"
        href="mailto:alex.j.unnippillil@gmail.com"
        target="_blank"
        role="menuitem"
        aria-label="Contact Me"
        className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Contact Me</span>
      </a>
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
        type="button"
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        role="menuitem"
        aria-label="Reset Kali Linux"
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Reset Kali Linux</span>
      </button>
    </div>
  );
};

export default DefaultMenu;
