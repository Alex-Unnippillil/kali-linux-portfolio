import React, { useMemo } from 'react'
import ContextMenuPanel from './context-menu-panel'

function AppMenu(props) {
    const { active, pinned, pinApp, unpinApp, onClose, appName } = props

    const favouriteLabel = pinned ? 'Remove from Favorites' : 'Add to Favorites'

    const groups = useMemo(() => [
        {
            id: 'desktop-actions',
            label: 'Desktop Actions',
            items: [
                {
                    id: 'pin-panel',
                    icon: '📌',
                    label: pinned ? 'Unpin from Panel' : 'Pin to Panel',
                    feedback: ({ anchor }) => `${pinned ? 'Would unpin' : 'Would pin'} ${anchor || 'item'} ${pinned ? 'from' : 'to'} panel`,
                    closeOnSelect: false,
                },
                {
                    id: 'favorites',
                    icon: '⭐',
                    label: favouriteLabel,
                    onSelect: () => {
                        if (pinned) {
                            unpinApp && unpinApp()
                        } else {
                            pinApp && pinApp()
                        }
                    },
                    feedback: ({ anchor }) => pinned
                        ? `Removed ${anchor || 'item'} from favorites`
                        : `Added ${anchor || 'item'} to favorites`,
                    closeOnSelect: true,
                },
            ],
        },
        {
            id: 'advanced',
            label: 'Permissions',
            items: [
                {
                    id: 'open-root',
                    icon: '🛡️',
                    label: 'Open as root',
                    feedback: ({ anchor }) => `Would open ${anchor || 'item'} with root privileges`,
                    closeOnSelect: false,
                },
            ],
        },
    ], [favouriteLabel, pinApp, pinned, unpinApp])

    return (
        <ContextMenuPanel
            id="app-menu"
            active={active}
            groups={groups}
            onClose={onClose}
            anchorLabel={appName}
            ariaLabel="Application context menu"
        />
    )
}

export default AppMenu
