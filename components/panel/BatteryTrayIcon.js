"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const BATTERY_GOOD = '/themes/Yaru/status/battery-good-symbolic.svg';

export default function BatteryTrayIcon() {
    const [level, setLevel] = useState(null);
    const [charging, setCharging] = useState(null);

    useEffect(() => {
        let isMounted = true;
        let battery = null;

        const updateBattery = () => {
            if (!isMounted || !battery) return;
            setLevel(battery.level);
            setCharging(battery.charging);
        };

        if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
            navigator.getBattery()
                .then((bat) => {
                    if (!isMounted) {
                        return;
                    }
                    battery = bat;
                    updateBattery();
                    battery.addEventListener?.('levelchange', updateBattery);
                    battery.addEventListener?.('chargingchange', updateBattery);
                })
                .catch(() => {
                    // ignore unsupported battery api
                });
        }

        return () => {
            isMounted = false;
            battery?.removeEventListener?.('levelchange', updateBattery);
            battery?.removeEventListener?.('chargingchange', updateBattery);
        };
    }, []);

    const percent = level !== null ? Math.round(level * 100) : null;
    const label = percent === null
        ? 'Battery status unavailable'
        : `${percent}% battery${charging ? ' (charging)' : ''}`;

    return (
        <div className="relative group flex items-center">
            <Image
                src={BATTERY_GOOD}
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

