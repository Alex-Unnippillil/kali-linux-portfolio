import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

const interactiveItemClasses = 'w-full text-left cursor-default py-0.5 mb-1.5 transition-hover transition-active hover:bg-[var(--interactive-hover)] focus:bg-[var(--interactive-hover)] focus-visible:bg-[var(--interactive-hover)] active:bg-[var(--interactive-active)]'

function DefaultMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    return (
        <div
            id="default-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={`${props.active ? 'block' : 'hidden'} cursor-default w-52 context-menu-bg border text-left border-[color:var(--color-border)] text-[color:var(--color-text)] py-4 absolute z-50 text-sm`}
        >

            <Devider />
            <a
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/unnippillil/"
                target="_blank"
                role="menuitem"
                aria-label="Follow on Linkedin"
                className={`block ${interactiveItemClasses}`}
            >
                <span className="ml-5">🙋‍♂️</span> <span className="ml-2">Follow on <strong>Linkedin</strong></span>
            </a>
            <a
                rel="noopener noreferrer"
                href="https://github.com/Alex-Unnippillil"
                target="_blank"
                role="menuitem"
                aria-label="Follow on Github"
                className={`block ${interactiveItemClasses}`}
            >
                <span className="ml-5">🤝</span> <span className="ml-2">Follow on <strong>Github</strong></span>
            </a>
            <a
                rel="noopener noreferrer"
                href="mailto:alex.j.unnippillil@gmail.com"
                target="_blank"
                role="menuitem"
                aria-label="Contact Me"
                className={`block ${interactiveItemClasses}`}
            >
                <span className="ml-5">📥</span> <span className="ml-2">Contact Me</span>
            </a>
            <Devider />
            <button
                type="button"
                onClick={() => { localStorage.clear(); window.location.reload() }}
                role="menuitem"
                aria-label="Reset Kali Linux"
                className={interactiveItemClasses}
            >
                <span className="ml-5">🧹</span> <span className="ml-2">Reset Kali Linux</span>
            </button>
        </div>
    )
}

function Devider() {
    return (
        <div className="flex justify-center w-full">
            <div className="border-t border-[color:color-mix(in_srgb,_var(--color-border),_transparent_25%)] py-1 w-2/5"></div>
        </div>
    );
}

export default DefaultMenu
