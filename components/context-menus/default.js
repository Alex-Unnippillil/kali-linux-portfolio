import React, { useEffect, useRef } from 'react'
import useMenuFocusManagement from '../../hooks/useMenuFocusManagement'

function DefaultMenu(props) {
    const { active, onClose, restoreFocusRef } = props
    const menuRef = useRef(null)
    useMenuFocusManagement({
        containerRef: menuRef,
        active,
        orientation: 'vertical',
        restoreFocusRef,
    })

    useEffect(() => {
        if (!active) {
            return undefined
        }

        const handlePointer = (event) => {
            if (!menuRef.current || menuRef.current.contains(event.target)) {
                return
            }
            onClose && onClose()
        }

        const handleKey = (event) => {
            if (event.key !== 'Escape') {
                return
            }
            event.preventDefault()
            onClose && onClose()
        }

        document.addEventListener('mousedown', handlePointer)
        document.addEventListener('keydown', handleKey)

        return () => {
            document.removeEventListener('mousedown', handlePointer)
            document.removeEventListener('keydown', handleKey)
        }
    }, [active, onClose])

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onClose && onClose()
        }
    }

    return (
        <div
            id="default-menu"
            role="menu"
            aria-hidden={!active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(active ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >

            <Devider />
            <a
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/unnippillil/"
                target="_blank"
                role="menuitem"
                aria-label="Linkedin"
                className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5"><strong>Linkedin</strong></span>
            </a>
            <a
                rel="noopener noreferrer"
                href="https://github.com/Alex-Unnippillil"
                target="_blank"
                role="menuitem"
                aria-label="Github"
                className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5"><strong>Github</strong></span>
            </a>
            <a
                rel="noopener noreferrer"
                href="mailto:alex.j.unnippillil@gmail.com"
                target="_blank"
                role="menuitem"
                aria-label="Contact Me"
                className="w-full block cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Contact Me</span>
            </a>
            <Devider />
            <button
                type="button"
                onClick={() => { localStorage.clear(); window.location.reload() }}
                role="menuitem"
                aria-label="Reset Kali Linux"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Reset Kali Linux</span>
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
