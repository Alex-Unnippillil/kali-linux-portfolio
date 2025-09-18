import React from 'react';
import Image from 'next/image';
import WorkspaceSwitcher from '../workspaces/WorkspaceSwitcher';

const noop = () => {};

export default function Taskbar(props) {
    const {
        apps,
        closed_windows,
        minimized_windows,
        focused_windows,
        openApp,
        minimize,
        workspaces = [],
        currentWorkspaceId = '',
        onCreateWorkspace = noop,
        onRenameWorkspace = noop,
        onDuplicateWorkspace = noop,
        onSwitchWorkspace = noop,
    } = props;

    const runningApps = apps.filter(app => closed_windows[app.id] === false);

    const handleClick = (app) => {
        const id = app.id;
        if (minimized_windows[id]) {
            openApp(id);
        } else if (focused_windows[id]) {
            minimize(id);
        } else {
            openApp(id);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40 px-2 space-x-2" role="toolbar">
            <WorkspaceSwitcher
                workspaces={workspaces}
                currentWorkspaceId={currentWorkspaceId}
                onCreate={onCreateWorkspace}
                onRename={onRenameWorkspace}
                onDuplicate={onDuplicateWorkspace}
                onSwitch={onSwitchWorkspace}
            />
            <div className="flex-1 flex items-center overflow-x-auto">
                {runningApps.map(app => (
                    <button
                        key={app.id}
                        type="button"
                        aria-label={app.title}
                        data-context="taskbar"
                        data-app-id={app.id}
                        onClick={() => handleClick(app)}
                        className={(focused_windows[app.id] && !minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
                            'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10'}
                    >
                        <Image
                            width={24}
                            height={24}
                            className="w-5 h-5"
                            src={app.icon.replace('./', '/')}
                            alt=""
                            sizes="24px"
                        />
                        <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
                        {!focused_windows[app.id] && !minimized_windows[app.id] && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
