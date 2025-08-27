import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import {
    setWallpaper,
    resetSettings,
    getLocale,
    setLocale,
    getShortcuts,
    setShortcuts,
} from '../../utils/settingsStore';

export function Settings(props) {
    const { theme, setTheme, accent, setAccent } = useTheme();
    const [contrast, setContrast] = useState(0);
    const [currentWallpaper, setCurrentWallpaper] = useState(props.currBgImgName);
    const [previewWallpaper, setPreviewWallpaper] = useState(props.currBgImgName);
    const [locales, setLocales] = useState({});
    const [locale, setLocaleState] = useState(getLocale());
    const [shortcuts, setShortcutsState] = useState(getShortcuts());
    const [shortcutInput, setShortcutInput] = useState('');
    const liveRegion = useRef(null);

    const wallpapers = {
        "wall-1": "./images/wallpapers/wall-1.webp",
        "wall-2": "./images/wallpapers/wall-2.webp",
        "wall-3": "./images/wallpapers/wall-3.webp",
        "wall-4": "./images/wallpapers/wall-4.webp",
        "wall-5": "./images/wallpapers/wall-5.webp",
        "wall-6": "./images/wallpapers/wall-6.webp",
        "wall-7": "./images/wallpapers/wall-7.webp",
        "wall-8": "./images/wallpapers/wall-8.webp",
    };

    useEffect(() => {
        fetch('/locales.json').then(r => r.json()).then(setLocales).catch(() => { });
    }, []);

    const previewWallpaperChange = (name) => {
        setPreviewWallpaper(name);
        props.changeBackgroundImage(name);
    };

    const selectWallpaper = (name) => {
        setWallpaper(name);
        setCurrentWallpaper(name);
        previewWallpaperChange(name);
    };

    const handleLocaleChange = (e) => {
        const value = e.target.value;
        setLocaleState(value);
        setLocale(value);
    };

    const addShortcut = () => {
        const val = shortcutInput.trim();
        if (!val) return;
        const updated = [...shortcuts, val];
        setShortcutsState(updated);
        setShortcuts(updated);
        setShortcutInput('');
    };

    const removeShortcut = (index) => {
        const updated = shortcuts.filter((_, i) => i !== index);
        setShortcutsState(updated);
        setShortcuts(updated);
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

    let contrastRatio = (hex1, hex2) => {
        let l1 = luminance(hexToRgb(hex1)) + 0.05;
        let l2 = luminance(hexToRgb(hex2)) + 0.05;
        return l1 > l2 ? l1 / l2 : l2 / l1;
    };

    let accentText = () => {
        return contrastRatio(accent, '#000000') > contrastRatio(accent, '#ffffff') ? '#000000' : '#ffffff';
    };

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accent, theme]);

    return (
        <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(${wallpapers[previewWallpaper]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Theme:</label>
                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="system">System</option>
                </select>
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
                <label className="mr-2 text-ubt-grey">Locale:</label>
                <select
                    value={locale}
                    onChange={handleLocaleChange}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    {Object.entries(locales).map(([key, val]) => (
                        <option key={key} value={key}>{val.name}</option>
                    ))}
                </select>
            </div>
            <div className="flex justify-center my-4">
                <div
                    className="p-4 rounded transition-colors duration-300 motion-reduce:transition-none"
                    style={{ backgroundColor: theme === 'dark' ? '#000000' : '#ffffff', color: theme === 'dark' ? '#ffffff' : '#000000' }}
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
                    Object.keys(wallpapers).map((name, index) => {
                        return (
                            <div
                                key={index}
                                role="button"
                                aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
                                tabIndex="0"
                                onMouseEnter={() => previewWallpaperChange(name)}
                                onMouseLeave={() => previewWallpaperChange(currentWallpaper)}
                                onClick={() => selectWallpaper(name)}
                                data-path={name}
                                className={((name === props.currBgImgName) ? " border-yellow-700 " : " border-transparent ") + " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"}
                                style={{ backgroundImage: `url(${wallpapers[name]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                            ></div>
                        );
                    })
                }
            </div>
            <div className="flex flex-col items-center my-4 border-t border-gray-900 pt-4">
                <label className="text-ubt-grey mb-2">Shortcuts:</label>
                <ul>
                    {shortcuts.map((s, i) => (
                        <li key={i} className="flex items-center my-1">
                            <span className="mr-2">{s}</span>
                            <button onClick={() => removeShortcut(i)} className="text-red-400">x</button>
                        </li>
                    ))}
                </ul>
                <div className="flex mt-2">
                    <input
                        value={shortcutInput}
                        onChange={(e) => setShortcutInput(e.target.value)}
                        className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey mr-2"
                        placeholder="New shortcut"
                    />
                    <button onClick={addShortcut} className="px-2 py-1 rounded bg-ub-orange text-white">Add</button>
                </div>
            </div>
            <div className="flex justify-center my-4 border-t border-gray-900 pt-4">
                <button
                    onClick={() => { resetSettings(); window.location.reload(); }}
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
