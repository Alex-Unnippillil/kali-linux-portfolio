import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { setWallpaper, resetSettings } from '../../utils/settingsStore';

export function Settings(props) {
    const { theme, setTheme } = useTheme();

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
        const name = e.target.dataset.path;
        setWallpaper(name);
        props.changeBackgroundImage(name);
    }

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
