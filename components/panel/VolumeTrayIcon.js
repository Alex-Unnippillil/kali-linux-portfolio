"use client";

import React, { useCallback, useState } from 'react';
import Image from 'next/image';

const VOLUME_ICON = '/themes/Yaru/status/audio-volume-medium-symbolic.svg';

export default function VolumeTrayIcon() {
    const [volume, setVolume] = useState(70);
    const [open, setOpen] = useState(false);

    const toggleOpen = useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    const handleChange = useCallback((event) => {
        const value = Number(event.target.value);
        if (!Number.isNaN(value)) {
            setVolume(value);
        }
    }, []);

    return (
        <div className="relative flex items-center" onMouseLeave={() => setOpen(false)}>
            <button
                type="button"
                aria-label={`Volume ${volume}%`}
                className="group flex items-center"
                onClick={toggleOpen}
            >
                <Image
                    src={VOLUME_ICON}
                    alt="Audio volume"
                    width={18}
                    height={18}
                    className="h-4 w-4"
                    sizes="18px"
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 rounded bg-black bg-opacity-80 px-2 py-1 text-[10px] text-white opacity-0 shadow transition-opacity duration-150 group-hover:opacity-100">
                    {volume}% volume
                </span>
            </button>
            {open && (
                <div className="absolute bottom-full right-0 z-50 mb-2 rounded-lg border border-white border-opacity-10 bg-black bg-opacity-90 p-3 shadow-lg">
                    <label htmlFor="volume-slider" className="mb-2 block text-xs text-white text-opacity-80">
                        Output volume
                    </label>
                    <input
                        id="volume-slider"
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={handleChange}
                        className="h-1 w-32 cursor-pointer appearance-none rounded bg-white bg-opacity-30 accent-ub-orange"
                    />
                    <div className="mt-1 text-right text-[10px] text-white text-opacity-70">{volume}%</div>
                </div>
            )}
        </div>
    );
}

