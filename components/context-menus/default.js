import React, { useRef, useId } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function DefaultMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    const hintId = useId()
    const roving = useRovingTabIndex({
        itemCount: props.active ? 4 : 0,
        orientation: 'vertical',
        enabled: props.active,
    })

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
            aria-describedby={hintId}
            ref={menuRef}
            onKeyDown={(e) => {
                roving.onKeyDown(e)
                handleKeyDown(e)
            }}
            className={(props.active ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >
            <p id={hintId} className="sr-only">
                Use arrow keys to move between menu items. Home jumps to the first item and End to the last.
            </p>
            <Devider />
            <a
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/unnippillil/"
                target="_blank"
                role="menuitem"
                aria-label="Follow on Linkedin"
                {...roving.getItemProps(0)}
                className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">🙋‍♂️</span> <span className="ml-2">Follow on <strong>Linkedin</strong></span>
            </a>
            <a
                rel="noopener noreferrer"
                href="https://github.com/Alex-Unnippillil"
                target="_blank"
                role="menuitem"
                aria-label="Follow on Github"
                {...roving.getItemProps(1)}
                className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">🤝</span> <span className="ml-2">Follow on <strong>Github</strong></span>
            </a>
            <a
                rel="noopener noreferrer"
                href="mailto:alex.j.unnippillil@gmail.com"
                target="_blank"
                role="menuitem"
                aria-label="Contact Me"
                {...roving.getItemProps(2)}
                className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">📥</span> <span className="ml-2">Contact Me</span>
            </a>
            <Devider />
            <button
                type="button"
                onClick={() => { localStorage.clear(); window.location.reload() }}
                role="menuitem"
                aria-label="Reset Kali Linux"
                {...roving.getItemProps(3)}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">🧹</span> <span className="ml-2">Reset Kali Linux</span>
            </button>
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
