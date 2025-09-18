import React from 'react';
import Image from 'next/image';
import TaskIcon from '../ubuntu/taskbar/TaskIcon';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);

    const handleClick = (app) => {
        const id = app.id;
        if (props.minimized_windows[id]) {
            props.openApp(id);
        } else if (props.focused_windows[id]) {
            props.minimize(id);
        } else {
            props.openApp(id);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40" role="toolbar">
            {runningApps.map(app => (
                <TaskIcon
                    key={app.id}
                    app={app}
                    focused={Boolean(props.focused_windows[app.id])}
                    minimized={Boolean(props.minimized_windows[app.id])}
                    onActivate={() => handleClick(app)}
                    preview={props.previews ? props.previews[app.id] : null}
                    requestPreview={props.onPreviewRequest}
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
                </TaskIcon>
            ))}
        </div>
    );
}
