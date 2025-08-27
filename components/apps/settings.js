import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import usePersistentState from '../../hooks/usePersistentState';

export function Settings(props) {
    const { theme, setTheme } = useTheme();
    const bool = (v) => typeof v === 'boolean';
    const [sound, setSound] = usePersistentState('pref-sound', true, bool);
    const [reducedMotion, setReducedMotion] = usePersistentState('pref-reduced-motion', false, bool);
    const [renderScale, setRenderScale] = usePersistentState('pref-render-scale', 1, (v) => typeof v === 'number');
    const defaultKeys = {
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        action: 'Space',
    };
    const [keyMap, setKeyMap] = usePersistentState('pref-keymap', defaultKeys, (v) => typeof v === 'object' && v);
    const updateKey = (action, value) => setKeyMap({ ...keyMap, [action]: value });
    const preferenceKeys = ['theme', 'pref-sound', 'pref-reduced-motion', 'pref-render-scale', 'pref-keymap'];
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(''), 3000);
        return () => clearTimeout(t);
    }, [toast]);

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

    let changeBackgroundImage = (e) => {
        props.changeBackgroundImage(e.target.dataset.path);
    };

    const resetApps = () => {
        const preserve = new Set(preferenceKeys);
        Object.keys(localStorage).forEach((key) => {
            if (!preserve.has(key)) {
                localStorage.removeItem(key);
            }
        });
        setToast('App data cleared');
    };

    const exportPrefs = () => {
        const data = { theme, sound, reducedMotion, renderScale, keyMap };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'preferences.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const importPrefs = (file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (typeof data.theme === 'string') setTheme(data.theme);
                if (typeof data.sound === 'boolean') setSound(data.sound);
                if (typeof data.reducedMotion === 'boolean') setReducedMotion(data.reducedMotion);
                if (typeof data.renderScale === 'number') setRenderScale(data.renderScale);
                if (data.keyMap && typeof data.keyMap === 'object') setKeyMap(data.keyMap);
                setToast('Preferences imported');
            } catch {
                setToast('Import failed');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(${wallpapers[props.currBgImgName]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
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
                </select>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey" htmlFor="sound">Sound Effects:</label>
                <input
                    id="sound"
                    type="checkbox"
                    checked={sound}
                    onChange={(e) => setSound(e.target.checked)}
                    data-testid="sound-toggle"
                />
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey" htmlFor="motion">Reduced Motion:</label>
                <input
                    id="motion"
                    type="checkbox"
                    checked={reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                    data-testid="motion-toggle"
                />
            </div>
            <div className="flex flex-col items-center my-4">
                <label className="text-ubt-grey mb-2" htmlFor="render-scale">Render Scale: {renderScale.toFixed(1)}</label>
                <input
                    id="render-scale"
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={renderScale}
                    onChange={(e) => setRenderScale(parseFloat(e.target.value))}
                    className="w-1/2"
                />
            </div>
            <div className="flex flex-col items-center my-4">
                <h3 className="text-ubt-grey mb-2">Keyboard Mapping</h3>
                {Object.keys(keyMap).map((action) => (
                    <div key={action} className="my-1">
                        <label className="mr-2 capitalize">{action}:</label>
                        <input
                            value={keyMap[action]}
                            onChange={(e) => updateKey(action, e.target.value)}
                            className="text-black px-1"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-center space-x-2 my-4">
                <button
                    type="button"
                    onClick={exportPrefs}
                    className="px-2 py-1 bg-blue-700 rounded"
                >
                    Export Preferences
                </button>
                <label className="px-2 py-1 bg-blue-700 rounded cursor-pointer">
                    Import Preferences
                    <input
                        type="file"
                        accept="application/json"
                        onChange={(e) => e.target.files && e.target.files[0] && importPrefs(e.target.files[0])}
                        className="hidden"
                        data-testid="import-input"
                    />
                </label>
                <button
                    type="button"
                    onClick={resetApps}
                    className="px-2 py-1 bg-red-700 rounded"
                    data-testid="reset-apps"
                >
                    Reset Apps
                </button>
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
                                onFocus={changeBackgroundImage}
                                data-path={name}
                                className={((name === props.currBgImgName) ? " border-yellow-700 " : " border-transparent ") + " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"}
                                style={{ backgroundImage: `url(${wallpapers[name]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                            ></div>
                        );
                    })
                }
            </div>
            {toast && (
                <div
                    role="alert"
                    className="fixed bottom-2 right-2 bg-black text-white px-2 py-1 rounded"
                >
                    {toast}
                </div>
            )}
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
