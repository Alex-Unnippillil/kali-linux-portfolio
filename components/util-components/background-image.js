import React from 'react'
import Image from 'next/image';
import { useSettings } from '../../hooks/useSettings';

export default function BackgroundImage() {
    const { wallpaper } = useSettings();
    return (
        <div className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full">
            <Image src={`/wallpapers/${wallpaper}.webp`} alt="" fill className="object-cover" />
        </div>
    )
}
