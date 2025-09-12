'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import Modal from '../base/Modal';

const isEditable = (el: HTMLElement) => {
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
};

export default function PowerMenu() {
  const [open, setOpen] = useState(false);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (isEditable(target)) return;
      if (e.ctrlKey && e.altKey && e.key === 'Delete') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const nodes = buttonsRef.current.filter((b): b is HTMLButtonElement => Boolean(b));
    if (nodes.length === 0) return;
    const current = document.activeElement as HTMLButtonElement;
    let index = nodes.indexOf(current);
    if (index === -1) index = 0;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      index = (index - 1 + nodes.length) % nodes.length;
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      index = (index + 1) % nodes.length;
    }
    nodes[index].focus();
  };

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)}>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-gray-800 text-white p-4 rounded space-y-2 min-w-[200px]">
          <button
            ref={(el) => (buttonsRef.current[0] = el)}
            className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring"
            type="button"
          >
            Shut Down
          </button>
          <button
            ref={(el) => (buttonsRef.current[1] = el)}
            className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring"
            type="button"
          >
            Restart
          </button>
          <button
            ref={(el) => (buttonsRef.current[2] = el)}
            className="w-full px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring"
            type="button"
          >
            Log out
          </button>
        </div>
      </div>
    </Modal>
  );
}

