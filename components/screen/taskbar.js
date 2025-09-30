import React from 'react';
import Image from 'next/image';
import ToolbarIcons from '../util-components/ToolbarIcons';

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

    const toolbarItems = runningApps.map(app => {
        const isMinimized = Boolean(props.minimized_windows[app.id]);
        const isFocused = Boolean(props.focused_windows[app.id]);
        const isActive = !isMinimized;

        return {
            id: app.id,
            label: app.title,
            icon: (
                <Image
                    width={32}
                    height={32}
                    style={{
                        width: 'var(--shell-taskbar-icon, 1.5rem)',
                        height: 'var(--shell-taskbar-icon, 1.5rem)',
                    }}
                    src={app.icon.replace('./', '/')}
                    alt=""
                    sizes="(max-width: 768px) 32px, 40px"
                />
            ),
            isActive,
            isFocused,
            onClick: () => handleClick(app),
            buttonProps: {
                'data-context': 'taskbar',
                'data-app-id': app.id,
                'aria-pressed': isActive,
            },
        };
    });

    return (

        <div
            className="absolute bottom-0 left-0 z-40 flex w-full items-center justify-start bg-black bg-opacity-50 backdrop-blur-sm"
            role="toolbar"
            style={{
                minHeight: 'calc(var(--shell-taskbar-height, 2.5rem) + var(--safe-area-bottom, 0px))',
                paddingTop: '0.35rem',
                paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 0.35rem)',
                paddingLeft: 'calc(var(--shell-taskbar-padding-x, 0.75rem) + var(--safe-area-left, 0px))',
                paddingRight: 'calc(var(--shell-taskbar-padding-x, 0.75rem) + var(--safe-area-right, 0px))',
            }}
        >
            <ToolbarIcons
                items={toolbarItems}
                className="flex-1"
                gap="var(--shell-taskbar-gap, 0.5rem)"
                moreButtonLabel="More applications"
                menuAriaLabel="Taskbar overflow"
            />
        </div>
    );
}
