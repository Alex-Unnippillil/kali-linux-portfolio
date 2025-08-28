import { useEffect, useRef } from 'react';
import Link from 'next/link';
import useFocusTrap from '../../hooks/useFocusTrap';

interface Shortcut {
  keys: string;
  description: string;
}

interface Group {
  title: string;
  shortcuts: Shortcut[];
}

const GROUPS: Group[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: 'Ctrl+/', description: 'Show keyboard shortcuts' },
      { keys: 'Esc', description: 'Close active modal' }
    ]
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'Tab', description: 'Move focus forward' },
      { keys: 'Shift+Tab', description: 'Move focus backward' }
    ]
  }
];

interface Props {
  open: boolean;
  onClose: () => void;
}

const ShortcutsModal = ({ open, onClose }: Props) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(modalRef, open);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white text-black p-4 rounded max-w-md w-full focus:outline-none"
      >
        <h2 className="text-lg font-bold mb-4">Keyboard Shortcuts</h2>
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            <h3 className="font-semibold mb-2">{group.title}</h3>
            <ul>
              {group.shortcuts.map((s) => (
                <li key={s.keys} className="flex justify-between mb-1">
                  <span>{s.description}</span>
                  <kbd className="px-1 py-0.5 border rounded bg-gray-100">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <Link href="/settings" className="text-blue-600 underline">
          Customize shortcuts in settings
        </Link>
        <div className="mt-4 text-right">
          <button
            ref={closeRef}
            className="px-2 py-1 bg-blue-600 text-white rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsModal;
