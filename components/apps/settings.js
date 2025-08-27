import React, { useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import usePersistentState from '../../hooks/usePersistentState';

export function Settings(props) {
    const { setTheme } = useTheme();

    const defaultTheme = 'dark';
    const defaultWallpaper = 'wall-2';
    const defaultFavorites = (props.apps || []).filter((a) => a.favourite).map((a) => a.id);

    const [theme, setThemeState, resetTheme] = usePersistentState('theme', defaultTheme, (v) => v === 'light' || v === 'dark');
    const [wallpaper, setWallpaper, resetWallpaper] = usePersistentState('bg-image', props.currBgImgName || defaultWallpaper);
    const [favorites, setFavorites, resetFavorites] = usePersistentState('favorites', defaultFavorites, Array.isArray);
    const [fontScale, setFontScale, resetFontScale] = usePersistentState('font-scale', 100, (v) => typeof v === 'number');

    useEffect(() => {
        setTheme(theme);
    }, [theme, setTheme]);

    useEffect(() => {
        props.changeBackgroundImage(wallpaper);
    }, [wallpaper, props]);

    useEffect(() => {
        document.documentElement.style.fontSize = `${fontScale}%`;
    }, [fontScale]);

    useEffect(() => {
        window.dispatchEvent(new Event('favoritesUpdated'));
    }, [favorites]);

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

    const changeBackgroundImage = (e) => {
        setWallpaper(e.target.dataset.path);
    };

    const toggleFavorite = (id) => {
        setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
    };

    const applyAccessibility = () => {
        setThemeState('light');
        setFontScale(125);
    };

    const resetAll = () => {
        resetTheme();
        resetWallpaper();
        resetFavorites();
        resetFontScale();
        setTheme(defaultTheme);
        props.changeBackgroundImage(defaultWallpaper);
        document.documentElement.style.fontSize = '100%';
        window.dispatchEvent(new Event('favoritesUpdated'));
    };

    return (
        <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(${wallpapers[wallpaper]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
            </div>
            <div className="flex justify-center my-4">
                <label className="mr-2 text-ubt-grey">Theme:</label>
                <select
                    value={theme}
                    onChange={(e) => setThemeState(e.target.value)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                </select>
            </div>
            <div className="flex flex-col items-center my-4">
                <span className="text-ubt-grey mb-2">Favorites:</span>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto w-5/6">
                    {(props.apps || []).map((app) => (
                        <label key={app.id} className="flex items-center text-ubt-grey">
                            <input
                                type="checkbox"
                                className="mr-2"
                                checked={favorites.includes(app.id)}
                                onChange={() => toggleFavorite(app.id)}
                            />
                            {app.title}
                        </label>
                    ))}
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
                                onFocus={changeBackgroundImage}
                                data-path={name}
                                className={((name === wallpaper) ? " border-yellow-700 " : " border-transparent ") + " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"}
                                style={{ backgroundImage: `url(${wallpapers[name]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}
                            ></div>
                        );
                    })
                }
            </div>
            <div className="flex justify-center space-x-4 my-4">
                <button onClick={applyAccessibility} className="px-3 py-1 bg-ub-cool-grey text-ubt-grey rounded border border-ubt-cool-grey">Accessibility preset</button>
                <button onClick={resetAll} className="px-3 py-1 bg-ub-cool-grey text-ubt-grey rounded border border-ubt-cool-grey">Reset to defaults</button>
            </div>
        </div>
    )
}

export default Settings;

export const displaySettings = () => {
    return <Settings> </Settings>;
};
