import React, { useRef } from 'react';
import Image from 'next/image';

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const buttonRefs = useRef([]);
    buttonRefs.current.length = runningApps.length;

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

    const handleKeyDown = (event, index) => {
        if (!runningApps.length) {
            return;
        }

        let targetIndex = index;
        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                targetIndex = (index + 1) % runningApps.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                targetIndex = (index - 1 + runningApps.length) % runningApps.length;
                break;
            case 'Home':
                event.preventDefault();
                targetIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                targetIndex = runningApps.length - 1;
                break;
            default:
                return;
        }

        const nextButton = buttonRefs.current[targetIndex];
        if (nextButton) {
            nextButton.focus();
        }
    };

    return (
        <div
            className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40"
            role="toolbar"
            aria-label="Running applications"
            aria-orientation="horizontal"
        >
            {runningApps.map((app, index) => {
                const id = app.id;
                const isMinimized = !!props.minimized_windows[id];
                const isFocused = !!props.focused_windows[id];
                const isActive = isFocused && !isMinimized;
                const stateLabel = isMinimized ? 'minimized' : isActive ? 'active window' : 'running in background';

                return (
                    <button
                        key={id}
                        type="button"
                        ref={(element) => {
                            buttonRefs.current[index] = element;
                        }}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        aria-label={`${app.title} (${stateLabel})`}
                        aria-posinset={index + 1}
                        aria-setsize={runningApps.length}
                        aria-pressed={isActive}
                        data-state={isMinimized ? 'minimized' : isActive ? 'active' : 'background'}
                        data-context="taskbar"
                        data-app-id={id}
                        onClick={() => handleClick(app)}
                        className={(isActive ? ' bg-white bg-opacity-20 ' : ' ') +
                            'relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'}
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
                        {!isFocused && !isMinimized && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
