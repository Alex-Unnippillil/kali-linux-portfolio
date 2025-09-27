import React, { useEffect, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import { safeLocalStorage } from '../../utils/safeStorage';

const PIN_STORAGE_KEY = 'kali-pinned';
const WORKSPACE_STORAGE_KEY = 'workspaces';
const workspaceFlag =
    process.env.NEXT_PUBLIC_ENABLE_WORKSPACES === 'true' ||
    process.env.NEXT_PUBLIC_UI_EXPERIMENTS === 'true';

function TaskbarMenu(props) {
    const menuRef = useRef(null);
    useFocusTrap(menuRef, props.active);
    useRovingTabIndex(menuRef, props.active, 'vertical');
    const [isPinned, setIsPinned] = useState(false);
    const [workspaces, setWorkspaces] = useState([]);

    useEffect(() => {
        if (!props.active || !props.appId) {
            setIsPinned(false);
            return;
        }

        let parsed = [];
        try {
            const stored = safeLocalStorage?.getItem(PIN_STORAGE_KEY);
            if (stored) {
                const json = JSON.parse(stored);
                if (Array.isArray(json)) {
                    parsed = json.filter((id) => typeof id === 'string');
                }
            }
        } catch (e) {
            parsed = [];
        }
        setIsPinned(parsed.includes(props.appId));
    }, [props.active, props.appId]);

    useEffect(() => {
        if (!props.appId) return;
        const target = document.querySelector(
            `[data-context="taskbar"][data-app-id="${props.appId}"]`
        );
        if (!target) return;
        if (isPinned) {
            target.setAttribute('data-kali-pinned', 'true');
        } else {
            target.removeAttribute('data-kali-pinned');
        }
    }, [isPinned, props.appId]);

    useEffect(() => {
        if (!props.active || !workspaceFlag) {
            setWorkspaces([]);
            return;
        }

        let parsed = [];
        try {
            const stored = safeLocalStorage?.getItem(WORKSPACE_STORAGE_KEY);
            if (stored) {
                const json = JSON.parse(stored);
                if (Array.isArray(json)) {
                    parsed = json
                        .filter((name) => typeof name === 'string')
                        .map((name) => name.trim())
                        .filter(Boolean);
                }
            }
        } catch (e) {
            parsed = [];
        }
        setWorkspaces(Array.from(new Set(parsed)));
    }, [props.active]);

    const showWorkspaceSection = workspaceFlag && workspaces.length > 1 && props.appId;

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            props.onCloseMenu && props.onCloseMenu();
        }
    };

    const handleMinimize = () => {
        props.onMinimize && props.onMinimize();
        props.onCloseMenu && props.onCloseMenu();
    };

    const togglePin = () => {
        if (!props.appId) return;

        let pinnedIds = [];
        try {
            const stored = safeLocalStorage?.getItem(PIN_STORAGE_KEY);
            if (stored) {
                const json = JSON.parse(stored);
                if (Array.isArray(json)) pinnedIds = json.filter((id) => typeof id === 'string');
            }
        } catch (e) {
            pinnedIds = [];
        }

        const nextPinned = !isPinned;
        const normalizedId = props.appId;

        if (nextPinned) {
            if (!pinnedIds.includes(normalizedId)) {
                pinnedIds.push(normalizedId);
            }
        } else {
            pinnedIds = pinnedIds.filter((id) => id !== normalizedId);
        }

        try {
            safeLocalStorage?.setItem(PIN_STORAGE_KEY, JSON.stringify(pinnedIds));
        } catch (e) {
            // ignore write errors
        }

        setIsPinned(nextPinned);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('kali-pinned', {
                    detail: { appId: normalizedId, pinned: nextPinned },
                })
            );
        }

        props.onCloseMenu && props.onCloseMenu();
    };

    const handleClose = () => {
        props.onClose && props.onClose();
        props.onCloseMenu && props.onCloseMenu();
    };

    const handleMoveToWorkspace = (workspace) => {
        if (!props.appId) return;

        if (props.onMoveToWorkspace) {
            props.onMoveToWorkspace(workspace, props.appId);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('kali-move-to-workspace', {
                    detail: { appId: props.appId, workspace },
                })
            );
        }

        props.onCloseMenu && props.onCloseMenu();
    };

    return (
        <div
            id="taskbar-menu"
            role="menu"
            aria-hidden={!props.active}
            ref={menuRef}
            onKeyDown={handleKeyDown}
            className={(props.active ? ' block ' : ' hidden ') + ' cursor-default w-40 context-menu-bg border text-left border-gray-900 rounded text-white py-2 absolute z-50 text-sm'}
        >
            <button
                type="button"
                onClick={handleMinimize}
                role="menuitem"
                aria-label={props.minimized ? 'Restore Window' : 'Minimize Window'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{props.minimized ? 'Restore' : 'Minimize'}</span>
            </button>
            <button
                type="button"
                onClick={togglePin}
                role="menuitem"
                aria-label={isPinned ? 'Unpin from Taskbar' : 'Pin to Taskbar'}
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">{isPinned ? 'Unpin' : 'Pin to Taskbar'}</span>
            </button>
            {showWorkspaceSection && (
                <div className="mb-1.5" role="none">
                    <div className="px-5 py-1 text-xs uppercase tracking-wide text-gray-300" role="presentation">
                        Move to Workspace
                    </div>
                    {workspaces.map((workspace) => (
                        <button
                            key={workspace}
                            type="button"
                            onClick={() => handleMoveToWorkspace(workspace)}
                            role="menuitem"
                            aria-label={`Move to workspace ${workspace}`}
                            className="w-full text-left cursor-default py-0.5 hover:bg-gray-700"
                        >
                            <span className="ml-5">{workspace}</span>
                        </button>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={handleClose}
                role="menuitem"
                aria-label="Close Window"
                className="w-full text-left cursor-default py-0.5 hover:bg-gray-700 mb-1.5"
            >
                <span className="ml-5">Close</span>
            </button>
        </div>
    );
}

export default TaskbarMenu;
