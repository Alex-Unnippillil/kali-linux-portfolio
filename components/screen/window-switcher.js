import React, { useEffect, useRef, useState } from 'react';

// Carousel window switcher opened via keyboard or gesture. Displays
// window screenshots when available and falls back to titles. Uses
// requestAnimationFrame for smooth ~60fps translations.
export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
    const [selected, setSelected] = useState(0);
    const listRef = useRef(null);
    const frameRef = useRef(null);
    const ITEM_WIDTH = 160; // width including margins

    // Select current window when Ctrl is released
    useEffect(() => {
        const handleKeyUp = (e) => {
            if (e.key === 'Control') {
                const win = windows[selected];
                if (win && typeof onSelect === 'function') {
                    onSelect(win.id);
                } else if (typeof onClose === 'function') {
                    onClose();
                }
            }
        };
        window.addEventListener('keyup', handleKeyUp);
        return () => window.removeEventListener('keyup', handleKeyUp);
    }, [windows, selected, onSelect, onClose]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const len = windows.length;
                if (!len) return;
                const dir = e.shiftKey ? -1 : 1;
                setSelected((selected + dir + len) % len);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                if (typeof onClose === 'function') onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [windows, selected, onClose]);

    // animate carousel using requestAnimationFrame
    useEffect(() => {
        const animate = () => {
            if (listRef.current) {
                listRef.current.style.transform = `translateX(${-selected * ITEM_WIDTH}px)`;
            }
            frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [selected]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
            <div className="overflow-hidden w-3/4 md:w-1/2">
                <ul ref={listRef} className="flex">
                    {windows.map((w, i) => (
                        <li
                            key={w.id}
                            className={`w-40 h-32 mx-2 flex flex-col items-center justify-center rounded ${i === selected ? 'text-ub-orange' : ''}`}
                        >
                            {w.image ? (
                                <img
                                    src={w.image}
                                    alt={w.title}
                                    className="w-full h-24 object-cover rounded"
                                />
                            ) : (
                                <div className="w-full h-24 flex items-center justify-center bg-ub-grey rounded text-sm">
                                    {w.title}
                                </div>
                            )}
                            <span className="mt-1 text-sm">{w.title}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

