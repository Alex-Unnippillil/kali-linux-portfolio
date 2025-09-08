"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import usePersistentState from '../../hooks/usePersistentState';

export default function Taskbar(props) {
    const pinnedApps = props.apps.filter(app => (props.dock || []).includes(app.id));
    const runningApps = props.apps.filter(
        app => props.closed_windows[app.id] === false && !(props.dock || []).includes(app.id)
    );
    const [behavior] = usePersistentState('xfce.panel.autohideBehavior', 'never');
    const [visible, setVisible] = useState(true);
    const hideTimer = useRef(null);

    const handleClick = (app) => {
        const id = app.id;
        if (props.closed_windows[id] || props.minimized_windows[id]) {
            props.openApp(id);
        } else if (props.focused_windows[id]) {
            props.minimize(id);
        } else {
            props.openApp(id);
        }
    };

    const show = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setVisible(true);
    };

    const scheduleHide = () => {
        if (behavior === 'never') return;
        const delay = behavior === 'intelligent' ? 800 : 0;
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), delay);
    };

    useEffect(() => {
        if (behavior === 'never') {
            setVisible(true);
            return;
        }
        scheduleHide();
        const handleMove = (e) => {
            if (window.innerHeight - e.clientY <= 5) {
                show();
            }
        };
        window.addEventListener('mousemove', handleMove);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            if (hideTimer.current) clearTimeout(hideTimer.current);
        };
    }, [behavior]);

    const renderButton = (app) => {
        const id = app.id;
        const isFocused = props.focused_windows[id] && !props.minimized_windows[id];
        const isRunning = props.closed_windows[id] === false;
        return (
            <button
                key={id}
                type="button"
                aria-label={app.title}
                data-context="taskbar"
                data-app-id={id}
                onClick={() => handleClick(app)}
                className={
                    (isFocused ? ' bg-white bg-opacity-20 ' : ' ') +
                    'group relative flex items-center mx-1 px-2 py-1 rounded hover:bg-white hover:bg-opacity-10 active:bg-white active:bg-opacity-20 cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 overflow-visible'
                }
            >
                <Image
                    width={24}
                    height={24}
                    className="w-5 h-5 transition-transform duration-200 ease-out group-hover:scale-110"
                    src={app.icon.replace('./', '/')}
                    alt=""
                    sizes="24px"
                />
                <span className="ml-1 text-sm text-white whitespace-nowrap">{app.title}</span>
                {isRunning && (
                    <span
                        data-testid="running-indicator"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-white rounded opacity-80 transition-opacity group-hover:opacity-100 group-active:opacity-100 group-focus-visible:opacity-100"
                    />
                )}
            </button>
        );
    };

    return (
        <div
            onMouseEnter={show}
            onMouseLeave={scheduleHide}
            style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.3s' }}
            className="absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40"
            role="toolbar"
            aria-label="Taskbar"
        >
            {pinnedApps.map(renderButton)}
            {pinnedApps.length > 0 && runningApps.length > 0 && (
                <div
                    data-testid="pinned-separator"
                    className="w-px h-6 bg-white bg-opacity-20 mx-1"
                />
            )}
            {runningApps.map(renderButton)}
        </div>
    );
}
