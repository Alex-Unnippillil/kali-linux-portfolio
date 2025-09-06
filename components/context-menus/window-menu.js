import React, { useRef, useEffect } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

function WindowMenu({ active, flags, onToggle, onClose, onMoveWorkspace }) {
  const menuRef = useRef(null);
  useFocusTrap(menuRef, active);
  useRovingTabIndex(menuRef, active, 'vertical');

  useEffect(() => {
    if (!active) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose && onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose && onClose();
      }
    };
    const handleBlur = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.relatedTarget)) {
        onClose && onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    menuRef.current && menuRef.current.addEventListener('blur', handleBlur, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      menuRef.current && menuRef.current.removeEventListener('blur', handleBlur, true);
    };
  }, [active, onClose]);

  const renderItem = (label, key, action) => (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={flags[key] ? 'true' : 'false'}
      onClick={() => {
        action();
        onClose && onClose();
      }}
      className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
    >
      <span className="ml-5">{flags[key] ? '✔' : ''}</span> <span className="ml-2">{label}</span>
    </button>
  );

  return (
    <div
      role="menu"
      aria-hidden={!active}
      ref={menuRef}
      className={(active ? ' block ' : ' hidden ') + ' cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm left-0 top-0'}
    >
      {renderItem('Move', 'movable', () => onToggle('movable'))}
      {renderItem('Resize', 'resizable', () => onToggle('resizable'))}
      {renderItem('Always on Top', 'alwaysOnTop', () => onToggle('alwaysOnTop'))}
      {renderItem('Sticky', 'sticky', () => onToggle('sticky'))}
      {renderItem('Fullscreen', 'fullscreen', () => onToggle('fullscreen'))}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onMoveWorkspace && onMoveWorkspace();
          onClose && onClose();
        }}
        className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
      >
        <span className="ml-5">Move to Workspace →</span>
      </button>
    </div>
  );
}

export default WindowMenu;
