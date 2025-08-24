import React, { useState, useEffect, useRef } from 'react';

const MENU_STRINGS = {
    en: {
        defaultMenu: 'Main menu',
        follow: 'Follow on',
        contact: 'Contact Me',
        reset: 'Reset Ubuntu Linux',
    },
    es: {
        defaultMenu: 'Menú principal',
        follow: 'Seguir en',
        contact: 'Contáctame',
        reset: 'Restablecer Ubuntu Linux',
    },
};

const MENU_LABELS = {
    followLinkedIn: 'Follow on Linkedin',
    followGithub: 'Follow on Github',
    contact: 'Contact Me',
    reset: 'Reset Ubuntu Linux',
}

function DefaultMenu(props) {
    const [locale, setLocale] = useState('en');
    const itemRefs = useRef([]);

    useEffect(() => {
        itemRefs.current = [];
    });

    useEffect(() => {
        if (typeof navigator !== 'undefined') {
            setLocale(navigator.language.slice(0, 2));
        }
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

    const resetUbuntu = () => {
        localStorage.clear();
        window.location.reload();
    };

    return (
        <div
            id="default-menu"
            role="menu"
            aria-label={strings.defaultMenu}
            tabIndex={-1}
            onKeyDown={handleKeyDown}

            className={
                (props.active ? 'block pointer-events-auto ' : 'hidden pointer-events-none ') +
                'cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-menu text-sm'
            }
        >
            <Devider />
            <a
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/unnippillil/"
                target="_blank"
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">🙋‍♂️</span>{' '}
                <span className="ml-2">{strings.follow} <strong>Linkedin</strong></span>

            </a>
            <a
                rel="noopener noreferrer"
                href="https://github.com/Alex-Unnippillil"
                target="_blank"
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">🤝</span>{' '}
                <span className="ml-2">{strings.follow} <strong>Github</strong></span>

            </a>
            <a
                rel="noopener noreferrer"
                href="mailto:alex.j.unnippillil@gmail.com"
                target="_blank"
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">📥</span>{' '}
                <span className="ml-2">{strings.contact}</span>
            </a>
            <Devider />
            <div
                onClick={resetUbuntu}
                role="menuitem"
                tabIndex={-1}
                ref={(el) => el && itemRefs.current.push(el)}
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 mb-1.5"
            >
                <span className="ml-5">🧹</span>{' '}
                <span className="ml-2">{strings.reset}</span>

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

export default DefaultMenu;
