import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

function DefaultMenu(props) {
    const menuRef = useRef(null)
    const isActive = props.active && !props.disabled
    useFocusTrap(menuRef, isActive)
    useRovingTabIndex(menuRef, isActive, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const handleFollow = (event) => {
        if (props.disabled) {
            event.preventDefault()
        }
    }

    const handleReset = () => {
        if (props.disabled) return
        localStorage.clear()
        window.location.reload()
    }

    return (
        <div
            id="default-menu"
            role="menu"
            aria-hidden={!isActive}
            aria-disabled={props.disabled ? true : undefined}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(isActive ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm" + (props.disabled ? " opacity-60 pointer-events-none" : "")}
        >

            <Devider />
            <a
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/unnippillil/"
                target="_blank"
                role="menuitem"
                aria-label="Follow on Linkedin"
                aria-disabled={props.disabled ? true : undefined}
                onClick={handleFollow}
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
                aria-disabled={props.disabled ? true : undefined}
                onClick={handleFollow}
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
                aria-disabled={props.disabled ? true : undefined}
                onClick={handleFollow}
                className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">📥</span> <span className="ml-2">Contact Me</span>
            </a>
            <Devider />
            <button
                type="button"
                onClick={handleReset}
                role="menuitem"
                aria-label="Reset Kali Linux"
                disabled={props.disabled}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
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
