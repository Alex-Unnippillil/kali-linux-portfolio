import React, { useEffect, useState, lazy, Suspense } from 'react';
import { z } from 'zod';
const WallpaperPreview = lazy(() => import('./WallpaperPreview'));

export function Settings(props) {
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

    const [bg, setBg] = useState(props.currBgImgName);
    const SETTINGS_KEY = 'settings';

    const settingsSchema = z
        .object({
            theme: z.enum(['light', 'dark']).default('dark'),
            density: z.enum(['comfortable', 'compact']).default('comfortable'),
            motion: z.boolean().default(true),
            colorBlind: z
                .enum(['none', 'protanopia', 'deuteranopia', 'tritanopia'])
                .default('none'),
            language: z.enum(['en', 'es', 'fr', 'de']).default('en'),
            dataSharing: z.boolean().default(true),
        })
        .default({
            theme: 'dark',
            density: 'comfortable',
            motion: true,
            colorBlind: 'none',
            language: 'en',
            dataSharing: true,
        });

    const [settings, setSettings] = useState(settingsSchema.parse({}));

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = settingsSchema.safeParse(JSON.parse(stored));
                if (parsed.success) setSettings(parsed.data);
            }
        } catch (e) {
            // ignore
        }
    }, []);

    const saveSettings = (s) => {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
        } catch {}
    };

    const changeBackgroundImage = (e) => {
        const name = e.target.dataset.path;
        props.changeBackgroundImage(name);
        setBg(name);
    };

    const handleThemeChange = (e) => {
        const value = e.target.value;
        if (value === 'light' || value === 'dark') {
            const updated = { ...settings, theme: value };
            setSettings(updated);
            saveSettings(updated);
        }
    };

    const handleDensityChange = (e) => {
        const value = e.target.value;
        if (value === 'comfortable' || value === 'compact') {
            const updated = { ...settings, density: value };
            setSettings(updated);
            saveSettings(updated);
        }
    };

    const handleMotionChange = (e) => {
        const value = e.target.checked;
        const updated = { ...settings, motion: value };
        setSettings(updated);
        saveSettings(updated);
    };

    const handleColorBlindChange = (e) => {
        const value = e.target.value;
        if (['none', 'protanopia', 'deuteranopia', 'tritanopia'].includes(value)) {
            const updated = { ...settings, colorBlind: value };
            setSettings(updated);
            saveSettings(updated);
        }
    };

    const handleLanguageChange = (e) => {
        const value = e.target.value;
        if (['en', 'es', 'fr', 'de'].includes(value)) {
            const updated = { ...settings, language: value };
            setSettings(updated);
            saveSettings(updated);
        }
    };

    const handleDataSharingChange = (e) => {
        const value = e.target.checked;
        const updated = { ...settings, dataSharing: value };
        setSettings(updated);
        saveSettings(updated);
    };

    const resetAll = () => {
        const defaults = settingsSchema.parse({});
        setSettings(defaults);
        try {
            localStorage.removeItem(SETTINGS_KEY);
        } catch {}
    };

    const { theme, density, motion, colorBlind, language, dataSharing } = settings;

    return (
        <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-panel p-4">
            <Suspense fallback={<div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" />}>
                <WallpaperPreview src={wallpapers[bg]} />
            </Suspense>
            <fieldset className="mb-4">
                <legend className="font-bold">Appearance</legend>
                <div className="mb-2" role="radiogroup" aria-label="Theme">
                    <label className="mr-4">
                        <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={handleThemeChange} />
                        Light
                    </label>
                    <label>
                        <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={handleThemeChange} />
                        Dark
                    </label>
                </div>
                <div className="mb-2">
                    <label htmlFor="density" className="mr-2">Density</label>
                    <select id="density" value={density} onChange={handleDensityChange} className="border p-1">
                        <option value="comfortable">Comfortable</option>
                        <option value="compact">Compact</option>
                    </select>
                </div>
                <div className="flex items-center mb-2">
                    <label htmlFor="motion-toggle" className="mr-2">Motion</label>
                    <input id="motion-toggle" type="checkbox" checked={motion} onChange={handleMotionChange} />
                </div>
                <div>
                    <label htmlFor="colorblind" className="mr-2">Color palette</label>
                    <select id="colorblind" value={colorBlind} onChange={handleColorBlindChange} className="border p-1">
                        <option value="none">Default</option>
                        <option value="protanopia">Protanopia</option>
                        <option value="deuteranopia">Deuteranopia</option>
                        <option value="tritanopia">Tritanopia</option>
                    </select>
                </div>
            </fieldset>
            <fieldset className="mb-4">
                <legend className="font-bold">Language</legend>
                <select value={language} onChange={handleLanguageChange} className="border p-1">
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                </select>
            </fieldset>
            <fieldset className="mb-4">
                <legend className="font-bold">Privacy</legend>
                <div className="flex items-center">
                    <label htmlFor="data-sharing" className="mr-2">Share anonymous data</label>
                    <input id="data-sharing" type="checkbox" checked={dataSharing} onChange={handleDataSharingChange} />
                </div>
            </fieldset>
            <fieldset className="border-t border-gray-900 mt-4 pt-4">
                <legend className="font-bold">Wallpapers</legend>
                <div className="flex flex-wrap justify-center items-center">
                    {Object.keys(wallpapers).map((name, index) => (
                        <div
                            key={index}
                            tabIndex={0}
                            onFocus={changeBackgroundImage}
                            onClick={changeBackgroundImage}
                            data-path={name}
                            className={(name === bg ? ' border-yellow-700 ' : ' border-transparent ') + ' md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80'}
                            style={{ backgroundImage: `url(${wallpapers[name]})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center center' }}
                        />
                    ))}
                </div>
            </fieldset>
            <button className="btn mt-4" onClick={resetAll}>Reset all</button>
        </div>
    );
}

export default Settings;

export const displaySettings = () => {
    return <Settings> </Settings>;
};
