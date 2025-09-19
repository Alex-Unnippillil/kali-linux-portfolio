import React, { useEffect, useId, useRef } from 'react';
import Image from 'next/image';
import useFocusTrap from '../../../hooks/useFocusTrap';
import useRovingTabIndex from '../../../hooks/useRovingTabIndex';

const UNKNOWN_TIME = 'Unknown time';

const formatTimestamp = (value) => {
    if (!value) return UNKNOWN_TIME;
    try {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return UNKNOWN_TIME;
        return new Intl.DateTimeFormat(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            day: '2-digit',
            month: 'short',
        }).format(date);
    } catch (e) {
        return UNKNOWN_TIME;
    }
};

export default function RecentPopover({
    anchorRef,
    items = [],
    visible = false,
    onSelect,
    onClose,
}) {
    const popoverRef = useRef(null);
    const headingId = useId();

    useFocusTrap(popoverRef, visible);
    useRovingTabIndex(popoverRef, visible, 'vertical');

    useEffect(() => {
        if (!visible) return;
        const firstItem = popoverRef.current?.querySelector('[role="menuitem"]');
        firstItem?.focus();
    }, [visible, items]);

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onClose?.();
            anchorRef?.current?.focus();
        }
    };

    return (
        <div
            role="menu"
            aria-hidden={!visible}
            aria-labelledby={headingId}
            ref={popoverRef}
            onKeyDown={handleKeyDown}
            className={`${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} absolute bottom-12 right-0 w-64 rounded-md shadow-lg context-menu-bg border border-gray-900 text-white transition-opacity duration-150 z-50`}
        >
            <div id={headingId} className="px-3 py-2 text-xs font-semibold tracking-wide uppercase text-gray-300">
                Recent Apps
            </div>
            <div className="max-h-60 overflow-auto py-1" role="none">
                {items.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-300" role="none">
                        No recent apps yet
                    </div>
                ) : (
                    items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="menuitem"
                            tabIndex={-1}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-700 focus:outline-none focus-visible:bg-gray-700"
                            onClick={() => onSelect?.(item.id)}
                        >
                            <Image
                                src={item.icon}
                                alt=""
                                width={24}
                                height={24}
                                className="w-5 h-5 flex-shrink-0"
                                sizes="24px"
                            />
                            <div className="flex flex-col">
                                <span className="font-medium text-white">{item.title}</span>
                                <span className="text-xs text-gray-300">Last opened {formatTimestamp(item.lastOpened)}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
