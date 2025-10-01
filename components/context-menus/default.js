import React, { useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'

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
            className={(props.active ? " block " : " hidden ") + " absolute z-50 w-56 cursor-default rounded-lg border border-gray-900 p-2 text-left text-sm text-white shadow-xl context-menu-bg"}
        >
            <MenuSection label="Connect">
                <MenuAnchor
                    rel="noopener noreferrer"
                    href="https://www.linkedin.com/in/unnippillil/"
                    target="_blank"
                    ariaLabel="Follow on Linkedin"
                >
                    <span aria-hidden="true" className="mr-2">🙋‍♂️</span>
                    Follow on <strong>Linkedin</strong>
                </MenuAnchor>
                <MenuAnchor
                    rel="noopener noreferrer"
                    href="https://github.com/Alex-Unnippillil"
                    target="_blank"
                    ariaLabel="Follow on Github"
                >
                    <span aria-hidden="true" className="mr-2">🤝</span>
                    Follow on <strong>Github</strong>
                </MenuAnchor>
                <MenuAnchor
                    rel="noopener noreferrer"
                    href="mailto:alex.j.unnippillil@gmail.com"
                    target="_blank"
                    ariaLabel="Contact Me"
                >
                    <span aria-hidden="true" className="mr-2">📥</span>
                    Contact Me
                </MenuAnchor>
            </MenuSection>
            <Separator />
            <MenuSection label="System">
                <MenuButton
                    type="button"
                    onClick={() => { localStorage.clear(); window.location.reload() }}
                    ariaLabel="Reset Kali Linux"
                >
                    <span aria-hidden="true" className="mr-2">🧹</span>
                    Reset Kali Linux
                </MenuButton>
            </MenuSection>
        </div>
    )
}

function MenuSection({ label, children }) {
    return (
        <div role="none" className="py-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ubt-grey">{label}</p>
            <div className="space-y-0.5">
                {children}
            </div>
        </div>
    )
}

function MenuAnchor({ children, ariaLabel, ...props }) {
    return (
        <a
            {...props}
            role="menuitem"
            aria-label={ariaLabel}
            className="flex w-full items-center rounded px-4 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 hover:bg-gray-700/70"
        >
            {children}
        </a>
    )
}

function MenuButton({ children, ariaLabel, ...props }) {
    return (
        <button
            {...props}
            role="menuitem"
            aria-label={ariaLabel}
            className="flex w-full items-center rounded px-4 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 hover:bg-gray-700/70"
        >
            {children}
        </button>
    )
}

function Separator() {
    return <div role="separator" className="mx-2 my-2 border-t border-white/10" />
}

export default DefaultMenu
