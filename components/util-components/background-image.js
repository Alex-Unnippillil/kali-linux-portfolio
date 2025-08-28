import React, { useEffect, useState } from 'react'
import { useSettings } from '../../hooks/useSettings';

export default function BackgroundImage() {
    const { wallpaper } = useSettings();
    const [needsOverlay, setNeedsOverlay] = useState(false);

    useEffect(() => {
        const img = new Image();
        img.src = `/wallpapers/${wallpaper}.webp`;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 40) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            const avgR = r / count, avgG = g / count, avgB = b / count;
            const toLinear = (c) => {
                c /= 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            const lum = 0.2126 * toLinear(avgR) + 0.7152 * toLinear(avgG) + 0.0722 * toLinear(avgB);
            const contrast = (1.05) / (lum + 0.05); // white text luminance is 1
            setNeedsOverlay(contrast < 4.5);
        };
    }, [wallpaper]);

    return (
        <div
            style={{
                backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPositionX: "center"
            }}
            className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full"
        >
            {needsOverlay && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" aria-hidden="true"></div>
            )}
        </div>
    )
}
