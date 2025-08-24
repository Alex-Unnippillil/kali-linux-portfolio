import React, { useState, useEffect, useRef } from 'react';

const MENU_STRINGS = {
    en: {
        desktopMenu: 'Desktop menu',
        newFolder: 'New Folder',
        paste: 'Paste',
        showDesktop: 'Show Desktop in Files',
        openTerminal: 'Open in Terminal',
        changeBackground: 'Change Background...',
        displaySettings: 'Display Settings',
        settings: 'Settings',
        enterFullScreen: 'Enter Full Screen',
        exitFullScreen: 'Exit Full Screen',
    },
    es: {
        desktopMenu: 'Menú de escritorio',
        newFolder: 'Nueva carpeta',
        paste: 'Pegar',
        showDesktop: 'Mostrar escritorio en archivos',
        openTerminal: 'Abrir en la terminal',
        changeBackground: 'Cambiar fondo...',
        displaySettings: 'Configuración de pantalla',
        settings: 'Configuraciones',
        enterFullScreen: 'Entrar en pantalla completa',
        exitFullScreen: 'Salir de pantalla completa',
    },
};

function DesktopMenu(props) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [locale, setLocale] = useState('en');
    const itemRefs = useRef([]);

    useEffect(() => {
        itemRefs.current = [];
    });

    useEffect(() => {
        document.addEventListener('fullscreenchange', checkFullScreen);
        if (typeof navigator !== 'undefined') {
            setLocale(navigator.language.slice(0, 2));
        }
        return () => {
            document.removeEventListener('fullscreenchange', checkFullScreen);
        };
    }, []);

    useEffect(() => {
        if (props.active && itemRefs.current[0]) {
            itemRefs.current[0].focus();
        }
    }, [props.active]);

    const strings = MENU_STRINGS[locale] || MENU_STRINGS.en;

    const handleKeyDown = (e) => {
        const index = itemRefs.current.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = (index + 1) % itemRefs.current.length;
            itemRefs.current[next].focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = (index - 1 + itemRefs.current.length) % itemRefs.current.length;
            itemRefs.current[prev].focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.activeElement.click();
        }
    };

    const openTerminal = () => {
        props.openApp('terminal');
    };

    const openSettings = () => {
        props.openApp('settings');
    };

    const checkFullScreen = () => {
        if (document.fullscreenElement) {
            setIsFullScreen(true);
        } else {
            setIsFullScreen(false);
        }
    };

    const goFullScreen = () => {
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <div
            id="desktop-menu"
            role="menu"
            aria-label={strings.desktopMenu}
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={
                (props.active ? 'block pointer-events-auto ' : 'hidden pointer-events-none ') +
                'cursor-default w-52 context-menu-bg border text-left font-light border-gray-900 rounded text-white py-4 absolute z-menu text-sm'
            }
        >
            <div
                onClick={props.addNewFolder}
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">{strings.newFolder}</span>
            </div>
            <Devider />
            <div
                role="menuitem"
                aria-disabled="true"
                tabIndex={-1}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5 text-gray-400"
            >
                <span className="ml-5">{strings.paste}</span>
            </div>
            <Devider />
            <div
                role="menuitem"
                aria-disabled="true"
                tabIndex={-1}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5 text-gray-400"
            >
                <span className="ml-5">{strings.showDesktop}</span>
            </div>
            <div
                onClick={openTerminal}
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">{strings.openTerminal}</span>
            </div>
            <Devider />
            <div
                onClick={openSettings}
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">{strings.changeBackground}</span>
            </div>
            <Devider />
            <div
                role="menuitem"
                aria-disabled="true"
                tabIndex={-1}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5 text-gray-400"
            >
                <span className="ml-5">{strings.displaySettings}</span>
            </div>
            <div
                onClick={openSettings}
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">{strings.settings}</span>
            </div>
            <Devider />
            <div
                onClick={goFullScreen}
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">{isFullScreen ? strings.exitFullScreen : strings.enterFullScreen}</span>
            </div>
        </div>
    );
}

function Devider() {
    return (
        <div className="flex justify-center w-full" role="separator">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    );
}

export default DesktopMenu;
