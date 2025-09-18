"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const ONLINE_ICON = '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg';
const OFFLINE_ICON = '/themes/Yaru/status/network-wireless-signal-none-symbolic.svg';

export default function NetworkTrayIcon() {
    const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const icon = online ? ONLINE_ICON : OFFLINE_ICON;
    const label = online ? 'Network connected' : 'Network offline';

    return (
        <div className="relative group flex items-center">
            <Image
                src={icon}
                alt={label}
                width={18}
                height={18}
                className="h-4 w-4"
                sizes="18px"
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 rounded bg-black bg-opacity-80 px-2 py-1 text-[10px] text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
                {label}
            </span>
        </div>
    );
}

