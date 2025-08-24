import React, { useEffect, useState, lazy, Suspense } from 'react';
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
    const [theme, setTheme] = useState('dark');
    const [animations, setAnimations] = useState(true);
    const [sampling, setSampling] = useState(100);

    useEffect(() => {
        try {
            const storedTheme = localStorage.getItem('theme');
            if (storedTheme === 'light' || storedTheme === 'dark') setTheme(storedTheme);
            const storedAnim = localStorage.getItem('animations');
            if (storedAnim === 'true' || storedAnim === 'false') setAnimations(storedAnim === 'true');
            const storedSampling = parseInt(localStorage.getItem('analytics-sampling') || '', 10);
            if (!isNaN(storedSampling) && storedSampling >= 0 && storedSampling <= 100) setSampling(storedSampling);
        } catch (e) {
            // ignore
        }
    }, []);

    const changeBackgroundImage = (e) => {
        const name = e.target.dataset.path;
        props.changeBackgroundImage(name);
        setBg(name);
    };

    const handleThemeChange = (e) => {
        const value = e.target.value;
        if (value === 'light' || value === 'dark') {
            setTheme(value);
            try { localStorage.setItem('theme', value); } catch {}
        }
    };

    const handleAnimationsChange = (e) => {
        const value = e.target.checked;
        setAnimations(value);
        try { localStorage.setItem('animations', String(value)); } catch {}
    };

    const handleSamplingChange = (e) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value)) value = 0;
        if (value < 0) value = 0;
        if (value > 100) value = 100;
        setSampling(value);
        try { localStorage.setItem('analytics-sampling', String(value)); } catch {}
    };

    const resetAll = () => {
        setTheme('dark');
        setAnimations(true);
        setSampling(100);
        try {
            localStorage.removeItem('theme');
            localStorage.removeItem('animations');
            localStorage.removeItem('analytics-sampling');
        } catch {}
    };

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
                <div className="flex items-center">
                    <label htmlFor="animations-toggle" className="mr-2">Animations</label>
                    <input id="animations-toggle" type="checkbox" checked={animations} onChange={handleAnimationsChange} />
                </div>
            </fieldset>
            <fieldset className="mb-4">
                <legend className="font-bold">Analytics</legend>
                <label htmlFor="sampling" className="mr-2">Sample rate (%)</label>
                <input id="sampling" type="number" min="0" max="100" value={sampling} onChange={handleSamplingChange} className="border p-1 w-20" />
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
