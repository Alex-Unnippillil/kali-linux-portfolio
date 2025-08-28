import React from 'react'
import { useSettings } from '../../hooks/useSettings.js';

export default function BackgroundImage() {
    const { wallpaper } = useSettings();
    return (
        <div style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPositionX: "center" }} className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full">
        </div>
    )
}
