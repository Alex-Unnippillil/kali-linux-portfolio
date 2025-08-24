import React from 'react'

const MENU_LABELS = {
    followLinkedIn: 'Follow on Linkedin',
    followGithub: 'Follow on Github',
    contact: 'Contact Me',
    reset: 'Reset Kali Linux',
}

function DefaultMenu(props) {
    return (
        <div
            id="default-menu"
            role="menu"
            className={
                (props.active ? "block pointer-events-auto " : "hidden pointer-events-none ") +
                "cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-menu text-sm"
            }
        >

            <Devider />
            <a
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/unnippillil/"
                target="_blank"
                role="menuitem"
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">🙋‍♂️</span> <span className="ml-2">{MENU_LABELS.followLinkedIn}</span>
            </a>
            <a
                rel="noopener noreferrer"
                href="https://github.com/Alex-Unnippillil"
                target="_blank"
                role="menuitem"
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">🤝</span> <span className="ml-2">{MENU_LABELS.followGithub}</span>
            </a>
            <a
                rel="noopener noreferrer"
                href="mailto:alex.j.unnippillil@gmail.com"
                target="_blank"
                role="menuitem"
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">📥</span> <span className="ml-2">{MENU_LABELS.contact}</span>
            </a>
            <Devider />
            <div
                onClick={() => { localStorage.clear(); window.location.reload() }}
                role="menuitem"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (localStorage.clear(), window.location.reload())}
                className="w-full block cursor-default py-0.5 hover:bg-warm hover:bg-opacity-20 focus:bg-warm focus:bg-opacity-20 focus:outline-none mb-1.5"
            >
                <span className="ml-5">🧹</span> <span className="ml-2">{MENU_LABELS.reset}</span>
            </div>
        </div>
    )
}

function Devider() {
    return (
        <div className="flex justify-center w-full">
            <div className=" border-t border-gray-900 py-1 w-2/5"></div>
        </div>
    );
}

export default DefaultMenu
