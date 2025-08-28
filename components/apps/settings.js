import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { resetSettings, defaults } from '../../utils/settingsStore';

export function Settings() {
    const { accent, setAccent, wallpaper, setWallpaper, density, setDensity, reducedMotion, setReducedMotion } = useSettings();
    const [contrast, setContrast] = useState(0);
    const liveRegion = useRef(null);

    const wallpapers = ['wall-1', 'wall-2', 'wall-3', 'wall-4', 'wall-5', 'wall-6', 'wall-7', 'wall-8'];

    const changeBackgroundImage = (e) => {
        const name = e.currentTarget.dataset.path;
        setWallpaper(name);
    };

    let hexToRgb = (hex) => {
        hex = hex.replace('#', '');
        let bigint = parseInt(hex, 16);
        return {
            r: (bigint >> 16) & 255,
            g: (bigint >> 8) & 255,
            b: bigint & 255,
        };
    };

    let luminance = ({ r, g, b }) => {
        let a = [r, g, b].map(v => {
            v = v / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };

    const contrastRatio = useCallback((hex1, hex2) => {
        let l1 = luminance(hexToRgb(hex1)) + 0.05;
        let l2 = luminance(hexToRgb(hex2)) + 0.05;
        return l1 > l2 ? l1 / l2 : l2 / l1;
    }, []);

    const accentText = useCallback(() => {
        return contrastRatio(accent, '#000000') > contrastRatio(accent, '#ffffff') ? '#000000' : '#ffffff';
    }, [accent, contrastRatio]);

    useEffect(() => {
        let raf = requestAnimationFrame(() => {
            let ratio = contrastRatio(accent, accentText());
            setContrast(ratio);
            if (liveRegion.current) {
                const msg = `Contrast ratio ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? 'passes' : 'fails'}`;
                liveRegion.current.textContent = msg;
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [accent, accentText, contrastRatio]);

    return (
        <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Accent:</label>
                <input
                    type="color"
                    aria-label="Accent color picker"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="w-10 h-10 border border-ubt-cool-grey bg-ub-cool-grey"
                />
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Density:</label>
                <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey flex items-center">
                    <input
                        type="checkbox"
                        checked={reducedMotion}
                        onChange={(e) => setReducedMotion(e.target.checked)}
                        className="mr-2"
                    />
                    Reduced Motion
                </label>
            </div>
            <div className="flex justify-center my-4">
                <div
                    className="p-4 rounded transition-colors duration-[var(--transition-medium)] ease-[var(--transition-ease)] motion-reduce:transition-none"
                    style={{ backgroundColor: '#0f1317', color: '#ffffff' }}
                >
                    <p className="mb-2 text-center">Preview</p>
                    <button
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: accent, color: accentText() }}
                    >
                        Accent
                    </button>
                    <p className={`mt-2 text-sm text-center ${contrast >= 4.5 ? 'text-green-400' : 'text-red-400'}`}>
                        {`Contrast ${contrast.toFixed(2)}:1 ${contrast >= 4.5 ? 'Pass' : 'Fail'}`}
                    </p>
                    <span ref={liveRegion} role="status" aria-live="polite" className="sr-only"></span>
                </div>
            </div>
            <div className="flex flex-wrap justify-center items-center border-t border-gray-900">
                {
                    wallpapers.map((name, index) => (
                        <div
                            key={index}
                            role="button"
                            aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
                            aria-pressed={name === wallpaper}
                            tabIndex="0"
                            onClick={changeBackgroundImage}
                            onFocus={changeBackgroundImage}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    changeBackgroundImage(e);
                                }
                            }}
                            data-path={name}
                            className={((name === wallpaper) ? " border-yellow-700 " : " border-transparent ") + " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"}
                            style={{ backgroundImage: `url(/wallpapers/${name}.webp)`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                        ></div>
                    ))
                }
            </div>
            <div className="flex justify-center my-4 border-t border-gray-900 pt-4">
                <button
                    onClick={async () => { await resetSettings(); setAccent(defaults.accent); setWallpaper(defaults.wallpaper); setDensity(defaults.density); setReducedMotion(defaults.reducedMotion); }}
                    className="px-4 py-2 rounded bg-ub-orange text-white"
                >
                    Reset Desktop
                </button>
            </div>
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
