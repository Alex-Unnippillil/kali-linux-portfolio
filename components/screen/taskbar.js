import React, { useState } from 'react';
import Image from 'next/image';
import { useSettings } from '../../hooks/useSettings';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const {
        panelPosition,
        panelSize,
        panelOpacity,
        panelAutohide,
        workspaceCount,
        workspaceNames,
    } = useSettings();
    const [hovered, setHovered] = useState(false);

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

    const translate = panelAutohide && !hovered
        ? (panelPosition === 'top' ? 'translateY(calc(-100% + 8px))' : 'translateY(calc(100% - 8px))')
        : 'translateY(0)';

    const panelStyle = {
        height: `${panelSize}px`,
        backgroundColor: `rgba(0, 0, 0, ${panelOpacity})`,
        transform: translate,
        transition: 'transform var(--motion-medium)',
    };

    const indicatorNames = workspaceNames.slice(0, workspaceCount);

    return (
        <div
            className={`desktop-panel absolute left-0 w-full flex items-center z-40 ${panelPosition === 'top' ? 'top-0' : 'bottom-0'}`}
            style={panelStyle}
            role="toolbar"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {runningApps.map(app => (
                <button
                    key={app.id}
                    type="button"
                    aria-label={app.title}
                    data-context="taskbar"
                    data-app-id={app.id}
                    onClick={() => handleClick(app)}
                    className={(props.focused_windows[app.id] && !props.minimized_windows[app.id] ? ' bg-white bg-opacity-20 ' : ' ') +
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
                    {!props.focused_windows[app.id] && !props.minimized_windows[app.id] && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                    )}
                </button>
            ))}
            {indicatorNames.length > 0 && (
                <div className="ml-auto flex items-center gap-2 pr-3">
                    {indicatorNames.map((name, index) => (
                        <span
                            key={`${name}-${index}`}
                            title={name}
                            className="px-2 py-1 text-xs rounded bg-white bg-opacity-10 text-white"
                            aria-label={`Workspace ${index + 1}: ${name}`}
                        >
                            {index + 1}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
