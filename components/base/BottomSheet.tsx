'use client';

import React, { useState, useRef } from 'react';
import Modal from './Modal';

interface BottomSheetProps {
    id: string;
    title: string;
    screen: (addFolder: any, openApp: (id: string) => void) => React.ReactNode;
    addFolder: any;
    openApp: (id: string) => void;
    closed: (id: string) => void;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ id, title, screen, addFolder, openApp, closed }) => {
    const [height, setHeight] = useState(50);
    const startY = useRef(0);
    const startHeight = useRef(50);

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        startY.current = e.clientY;
        startHeight.current = height;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (e: PointerEvent) => {
        const delta = startY.current - e.clientY;
        const newHeight = Math.min(100, Math.max(25, startHeight.current + (delta / window.innerHeight) * 100));
        setHeight(newHeight);
    };

    const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        setHeight(h => (h > 75 ? 100 : 50));
    };

    const handleClose = () => {
        closed(id);
    };

    return (
        <Modal isOpen={true} onClose={handleClose}>
            <div className="fixed inset-0 flex items-end justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
                <div
                    className="relative w-full bg-ub-grey text-white rounded-t-md shadow-lg flex flex-col"
                    style={{ height: `${height}vh` }}
                >
                    <div
                        className="p-2 flex justify-between items-center cursor-grab touch-none"
                        onPointerDown={onPointerDown}
                    >
                        <span>{title}</span>
                        <button onClick={handleClose} aria-label="Close">
                            ×
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        {screen(addFolder, openApp)}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default BottomSheet;

