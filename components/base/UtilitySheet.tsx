import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';

interface UtilitySheetProps {
  id: string;
  title: string;
  screen: (addFolder: any, openApp: any) => React.ReactNode;
  addFolder: (id: string) => void;
  openApp: (id: string) => void;
  closed: (id: string) => void;
  focus: (id: string) => void;
}

const UtilitySheet: React.FC<UtilitySheetProps> = ({
  id,
  title,
  screen,
  addFolder,
  openApp,
  closed,
  focus,
}) => {
  const [open, setOpen] = useState(true);
  const [snap, setSnap] = useState(0.5);
  const startY = useRef(0);
  const startSnap = useRef(0.5);

  useEffect(() => {
    setSnap(0.5);
  }, []);

  const handleClose = () => {
    setOpen(false);
    closed(id);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    startSnap.current = snap;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onPointerMove = (e: PointerEvent) => {
    const delta = startY.current - e.clientY;
    const next = startSnap.current + delta / window.innerHeight;
    const clamped = Math.min(0.9, Math.max(0.5, next));
    setSnap(clamped);
  };

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    setSnap((prev) => (prev < 0.7 ? 0.5 : 0.9));
  };

  return (
    <Modal isOpen={open} onClose={handleClose}>
      <div className="fixed inset-0 z-50" onMouseDown={() => focus(id)}>
        <div
          className="absolute inset-0 bg-black/50"
          onClick={handleClose}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 right-0 bg-ub-cool-grey text-white rounded-t-lg shadow-lg flex flex-col"
          style={{ height: `${snap * 100}vh` }}
          role="dialog"
          aria-label={title}
        >
          <div
            className="p-2 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onPointerDown}
          >
            <div className="w-12 h-1.5 bg-gray-500 rounded-full mx-auto" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {screen(addFolder, openApp)}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default UtilitySheet;
