import React, { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings';

export default function BackgroundImage() {
    const { wallpaper, reducedData } = useSettings();
    const [prefersReducedData, setPrefersReducedData] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-data: reduce)');
        const handler = (e) => setPrefersReducedData(e.matches);
        setPrefersReducedData(mq.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    if (reducedData || prefersReducedData) return null;

    return (
        <div style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPositionX: "center" }} className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full">
        </div>
    )
}
