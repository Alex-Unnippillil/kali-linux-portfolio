import React, { useEffect, useState } from 'react';
import { useTheme } from '../../hooks/useTheme';
import usePersistentState from '../../hooks/usePersistentState';

export function Settings(props) {
    const { theme, setTheme } = useTheme();
    const [sound, setSound] = usePersistentState('sound-effects', true, v => typeof v === 'boolean');
    const [motion, setMotion] = usePersistentState('reduced-motion', false, v => typeof v === 'boolean');
    const [toast, setToast] = useState('');

    useEffect(() => {
        document.documentElement.dataset.sound = sound ? 'on' : 'off';
    }, [sound]);

    useEffect(() => {
        document.documentElement.dataset.motion = motion ? 'reduced' : 'normal';
    }, [motion]);

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
        props.changeBackgroundImage && props.changeBackgroundImage(e.target.dataset.path);
    };

    const resetApps = () => {
        const t = theme;
        const s = sound;
        const m = motion;
        localStorage.clear();
        localStorage.setItem('theme', JSON.stringify(t));
        localStorage.setItem('sound-effects', JSON.stringify(s));
        localStorage.setItem('reduced-motion', JSON.stringify(m));
        setToast('Apps reset');
        setTimeout(() => setToast(''), 2000);
    };

    return (
        <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
            <div className="flex flex-col items-center my-4 space-y-2">
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={theme === 'dark'}
                        onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
                        className="mr-2"
                        aria-label="Dark theme"
                    />
                    <span className="text-ubt-grey">Dark theme</span>
                </label>
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={sound}
                        onChange={(e) => setSound(e.target.checked)}
                        className="mr-2"
                        aria-label="Sound effects"
                    />
                    <span className="text-ubt-grey">Sound effects</span>
                </label>
                <label className="flex items-center">
                    <input
                        type="checkbox"
                        checked={motion}
                        onChange={(e) => setMotion(e.target.checked)}
                        className="mr-2"
                        aria-label="Reduced motion"
                    />
                    <span className="text-ubt-grey">Reduced motion</span>
                </label>
                <button
                    type="button"
                    onClick={resetApps}
                    className="mt-2 px-3 py-1 bg-ubt-green text-black rounded"
                >
                    Reset apps
                </button>
                {toast && (
                    <div role="status" className="mt-2 text-ubt-grey">
                        {toast}
                    </div>
                )}
            </div>
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(${wallpapers[props.currBgImgName]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
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
        </div>
    )
}

export default Settings


export const displaySettings = () => {
    return <Settings> </Settings>;
}
