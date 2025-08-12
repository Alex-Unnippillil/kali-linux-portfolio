import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Draggable from 'react-draggable';
import Settings from '../apps/settings';
import ReactGA from 'react-ga4';
import { displayTerminal } from '../apps/terminal';

export const Window = forwardRef((props, ref) => {
    const id = props.id;
    const startX = 60;
    const startY = 10;
    const [cursorType, setCursorType] = useState("cursor-default");
    const [width, setWidth] = useState(60);
    const [height, setHeight] = useState(85);
    const [closed, setClosed] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [parentSize, setParentSize] = useState({ height: 100, width: 100 });
    const windowRef = useRef(null);

    useImperativeHandle(ref, () => windowRef.current);

    useEffect(() => {
        setDefaultWindowDimenstion();
        ReactGA.send({ hitType: "pageview", page: `/${id}`, title: "Custom Title" });
        window.addEventListener('resize', resizeBoundries);
        return () => {
            ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });
            window.removeEventListener('resize', resizeBoundries);
        };
    }, []);

    useEffect(() => {
        resizeBoundries();
    }, [height, width]);

    const setDefaultWindowDimenstion = () => {
        if (window.innerWidth < 640) {
            setHeight(60);
            setWidth(85);
        } else {
            setHeight(85);
            setWidth(60);
        }
    };

    const resizeBoundries = () => {
        setParentSize({
            height: window.innerHeight - (window.innerHeight * (height / 100.0)) - 28,
            width: window.innerWidth - (window.innerWidth * (width / 100.0))
        });
    };

    const changeCursorToMove = () => {
        focusWindow();
        if (maximized) {
            restoreWindow();
        }
        setCursorType("cursor-move");
    };

    const changeCursorToDefault = () => {
        setCursorType("cursor-default");
    };

    const handleVerticleResize = () => {
        setHeight(h => h + 0.1);
    };

    const handleHorizontalResize = () => {
        setWidth(w => w + 0.1);
    };

    const setWinowsPosition = () => {
        const r = windowRef.current;
        const rect = r.getBoundingClientRect();
        r.style.setProperty('--window-transform-x', rect.x.toFixed(1).toString() + "px");
        r.style.setProperty('--window-transform-y', (rect.y.toFixed(1) - 32).toString() + "px");
    };

    const checkOverlap = () => {
        const r = windowRef.current;
        const rect = r.getBoundingClientRect();
        if (rect.x.toFixed(1) < 50) {
            props.hideSideBar(id, true);
        } else {
            props.hideSideBar(id, false);
        }
    };

    const focusWindow = () => {
        props.focus(id);
    };

    const minimizeWindow = () => {
        let posx = -310;
        if (maximized) {
            posx = -510;
        }
        setWinowsPosition();
        const sidebBarApp = props.sidebarRefs.current[id].getBoundingClientRect();
        const r = windowRef.current;
        r.style.transform = `translate(${posx}px,${sidebBarApp.y.toFixed(1) - 240}px) scale(0.2)`;
        props.hasMinimised(id);
    };

    const restoreWindow = () => {
        const r = windowRef.current;
        setDefaultWindowDimenstion();
        let posx = r.style.getPropertyValue("--window-transform-x");
        let posy = r.style.getPropertyValue("--window-transform-y");
        r.style.transform = `translate(${posx},${posy})`;
        setTimeout(() => {
            setMaximized(false);
            checkOverlap();
        }, 300);
    };

    const maximizeWindow = () => {
        if (maximized) {
            restoreWindow();
        }
        else {
            focusWindow();
            setWinowsPosition();
            const r = windowRef.current;
            r.style.transform = `translate(-1pt,-2pt)`;
            setMaximized(true);
            setHeight(96.3);
            setWidth(100.2);
            props.hideSideBar(id, true);
        }
    };

    const closeWindow = () => {
        setWinowsPosition();
        setClosed(true);
        props.hideSideBar(id, false);
        setTimeout(() => {
            props.closed(id);
        }, 300);
    };

    return (
        <Draggable
            axis="both"
            handle=".bg-ub-window-title"
            grid={[1, 1]}
            scale={1}
            onStart={changeCursorToMove}
            onStop={changeCursorToDefault}
            onDrag={checkOverlap}
            allowAnyClick={false}
            defaultPosition={{ x: startX, y: startY }}
            bounds={{ left: 0, top: 0, right: parentSize.width, bottom: parentSize.height }}
        >
            <div
                ref={windowRef}
                style={{ width: `${width}%`, height: `${height}%` }}
                className={cursorType + " " + (closed ? " closed-window " : "") + (maximized ? " duration-300 rounded-none" : " rounded-lg rounded-b-none") + (props.minimized ? " opacity-0 invisible duration-200 " : "") + (props.isFocused ? " z-30 " : " z-20 notFocused") + " opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute window-shadow border-black border-opacity-40 border border-t-0 flex flex-col"}
                id={id}
            >
                <WindowYBorder resize={handleHorizontalResize} />
                <WindowXBorder resize={handleVerticleResize} />
                <WindowTopBar title={props.title} />
                <WindowEditButtons minimize={minimizeWindow} maximize={maximizeWindow} isMaximised={maximized} close={closeWindow} id={id} />
                {(id === "settings"
                    ? <Settings changeBackgroundImage={props.changeBackgroundImage} currBgImgName={props.bg_image_name} />
                    : <WindowMainScreen screen={props.screen} title={props.title}
                        addFolder={props.id === "terminal" ? props.addFolder : null}
                        openApp={props.openApp} />)}
            </div>
        </Draggable >
    );
});

export default Window;

export function WindowTopBar(props) {
    return (
        <div className={" relative bg-ub-window-title border-t-2 border-white border-opacity-5 py-1.5 px-3 text-white w-full select-none rounded-b-none"}>
            <div className="flex justify-center text-sm font-bold">{props.title}</div>
        </div>
    )
}

export const WindowYBorder = ({ resize }) => {
    const trpImg = useRef(null);
    useEffect(() => {
        trpImg.current = new Image(0, 0);
        trpImg.current.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        trpImg.current.style.opacity = 0;
    }, []);
    return (
        <div className=" window-y-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" onDragStart={(e) => { e.dataTransfer.setDragImage(trpImg.current, 0, 0) }} onDrag={resize}>
        </div>
    )
}

export const WindowXBorder = ({ resize }) => {
    const trpImg = useRef(null);
    useEffect(() => {
        trpImg.current = new Image(0, 0);
        trpImg.current.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        trpImg.current.style.opacity = 0;
    }, []);
    return (
        <div className=" window-x-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" onDragStart={(e) => { e.dataTransfer.setDragImage(trpImg.current, 0, 0) }} onDrag={resize}>
        </div>
    )
}

export function WindowEditButtons(props) {
    return (
        <div className="absolute select-none right-0 top-0 mt-1 mr-1 flex justify-center items-center">
            <span className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center mt-1 h-5 w-5 items-center" onClick={props.minimize}>
                <img
                    src="./themes/Yaru/window/window-minimize-symbolic.svg"
                    alt="Kali window minimize"
                    className="h-5 w-5 inline"
                />
            </span>
            {
                (props.isMaximised
                    ?
                    <span className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center mt-1 h-5 w-5 items-center" onClick={props.maximize}>
                        <img
                            src="./themes/Yaru/window/window-restore-symbolic.svg"
                            alt="Kali window restore"
                            className="h-5 w-5 inline"
                        />
                    </span>
                    :
                    <span className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center mt-1 h-5 w-5 items-center" onClick={props.maximize}>
                        <img
                            src="./themes/Yaru/window/window-maximize-symbolic.svg"
                            alt="Kali window maximize"
                            className="h-5 w-5 inline"
                        />
                    </span>
                )
            }
            <button tabIndex="-1" id={`close-${props.id}`} className="mx-1.5 focus:outline-none cursor-default bg-ub-cool-grey bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center mt-1 h-5 w-5 items-center" onClick={props.close}>
                <img
                    src="./themes/Yaru/window/window-close-symbolic.svg"
                    alt="Kali window close"
                    className="h-5 w-5 inline"
                />
            </button>
        </div>
    )
}

export const WindowMainScreen = (props) => {
    const [setDarkBg, setSetDarkBg] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => {
            setSetDarkBg(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);
    return (
        <div className={"w-full flex-grow z-20 max-h-full overflow-y-auto windowMainScreen" + (setDarkBg ? " bg-ub-drk-abrgn " : " bg-ub-cool-grey")}> 
            {props.addFolder ? displayTerminal(props.addFolder, props.openApp) : props.screen()}
        </div>
    )
}

