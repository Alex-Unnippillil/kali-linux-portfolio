import React from 'react';
import { useTheme } from '../../hooks/useTheme';

export function Settings(props) {
    const { theme, setTheme } = useTheme();

    const themes = {
        dark: { bg: '#111111', window: '#201f1f' },
        light: { bg: '#ffffff', window: '#f0f0f0' }
    };

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
    }

    return (
        <div className={"w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey"}>
            <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4" style={{ backgroundImage: `url(${wallpapers[props.currBgImgName]})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center center" }}>
            </div>
            <div className="flex flex-col items-center my-4">
                <span className="text-ubt-grey mb-2">Theme:</span>
                <div className="theme-cards">
                    {
                        Object.keys(themes).map((name) => (
                            <div
                                key={name}
                                role="button"
                                tabIndex="0"
                                aria-label={`Select ${name} theme`}
                                className={`theme-card${theme === name ? ' selected' : ''}`}
                                onClick={() => setTheme(name)}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setTheme(name)}
                            >
                                <div className="w-full h-full overflow-hidden rounded-sm">
                                    <div className="h-2/5 w-full" style={{ backgroundColor: themes[name].window }}></div>
                                    <div className="h-3/5 w-full" style={{ backgroundColor: themes[name].bg }}></div>
                                </div>
                            </div>
                        ))
                    }
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
