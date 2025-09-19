import React, { useEffect, useState } from 'react'
import {
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
} from '../common/ContextMenu'
import logger from '../../utils/logger'

function DesktopMenu({
    open,
    anchorPoint,
    onClose,
    onNewFolder,
    onCreateShortcut,
    onPaste,
    canPaste,
    onSelectAll,
    sortOrder,
    onToggleSort,
    viewMode,
    onToggleView,
    openTerminal,
    openSettings,
    onClearSession,
}) {
    const [isFullScreen, setIsFullScreen] = useState(false)

    useEffect(() => {
        const handleFullScreen = () => setIsFullScreen(Boolean(document.fullscreenElement))
        handleFullScreen()
        document.addEventListener('fullscreenchange', handleFullScreen)
        return () => document.removeEventListener('fullscreenchange', handleFullScreen)
    }, [])

    const handleFullScreenToggle = () => {
        try {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            } else {
                document.documentElement.requestFullscreen()
            }
        } catch (error) {
            logger.error(error)
        }
    }

    const sortLabel = sortOrder === 'desc' ? 'Sort by name (Z → A)' : 'Sort by name (A → Z)'
    const viewLabel = viewMode === 'list' ? 'View as grid' : 'View as list'
    const fullScreenLabel = isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'

    return (
        <ContextMenuContent
            id="desktop-menu"
            open={open}
            anchorPoint={anchorPoint}
            onClose={onClose}
            label="Desktop context menu"
        >
            <ContextMenuItem
                onSelect={onNewFolder}
                aria-label="Create new folder"
            >
                New Folder
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={onCreateShortcut}
                aria-label="Create desktop shortcut"
            >
                Create Shortcut…
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                onSelect={onPaste}
                disabled={!canPaste}
                aria-label="Paste clipboard contents"
            >
                Paste
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={onSelectAll}
                aria-label="Select all desktop icons"
            >
                Select All
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                onSelect={onToggleSort}
                role="menuitemcheckbox"
                checked={sortOrder === 'desc'}
                aria-label="Toggle desktop sort order"
            >
                {sortLabel}
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={onToggleView}
                role="menuitemcheckbox"
                checked={viewMode === 'list'}
                aria-label="Toggle desktop view mode"
            >
                {viewLabel}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                onSelect={openTerminal}
                aria-label="Open in terminal"
            >
                Open in Terminal
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={openSettings}
                aria-label="Change background"
            >
                Change Background…
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={openSettings}
                aria-label="Open settings"
            >
                Settings
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                onSelect={handleFullScreenToggle}
                aria-label={fullScreenLabel}
            >
                {fullScreenLabel}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
                onSelect={onClearSession}
                aria-label="Clear session"
            >
                Clear Session
            </ContextMenuItem>
        </ContextMenuContent>
    )
}

export default DesktopMenu

