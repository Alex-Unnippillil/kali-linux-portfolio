import React, { useMemo, useRef } from 'react'
import useFocusTrap from '../../hooks/useFocusTrap'
import useRovingTabIndex from '../../hooks/useRovingTabIndex'
import { MenuItemsList } from '../common/ContextMenu'

/** @typedef {import('../common/ContextMenu').MenuItem} MenuItem */

function DefaultMenu(props) {
    const menuRef = useRef(null)
    useFocusTrap(menuRef, props.active)
    useRovingTabIndex(menuRef, props.active, 'vertical')

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onClose && props.onClose()
        }
    }

    const followLinks = useMemo(
        () => /** @type {MenuItem[]} */ ([
            {
                id: 'follow-linkedin',
                icon: '🙋‍♂️',
                label: 'Follow on Linkedin',
                onSelect: () => window.open('https://www.linkedin.com/in/unnippillil/', '_blank', 'noopener,noreferrer'),
            },
            {
                id: 'follow-github',
                icon: '🤝',
                label: 'Follow on Github',
                onSelect: () => window.open('https://github.com/Alex-Unnippillil', '_blank', 'noopener,noreferrer'),
            },
            {
                id: 'contact-email',
                icon: '📥',
                label: 'Contact Me',
                onSelect: () => window.open('mailto:alex.j.unnippillil@gmail.com', '_self'),
            },
        ]),
        [],
    )

    const systemItems = useMemo(
        () => /** @type {MenuItem[]} */ ([
            {
                id: 'reset-session',
                icon: '🧹',
                label: 'Reset Kali Linux',
                onSelect: () => { localStorage.clear(); window.location.reload() },
            },
        ]),
        [],
    )

    const handleItemSelect = () => {
        props.onClose && props.onClose()
    }

    return (
        <div
            id="default-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? " block " : " hidden ") + " cursor-default w-52 context-menu-bg border text-left border-gray-900 rounded text-white py-4 absolute z-50 text-sm"}
        >

            <Devider />
            <MenuItemsList
                items={followLinks}
                onItemSelect={handleItemSelect}
            />
            <Devider />
            <MenuItemsList
                items={systemItems}
                onItemSelect={handleItemSelect}
            />
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
