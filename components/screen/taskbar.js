"use client";

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import usePersistentState from '../../hooks/usePersistentState';

const HIDE_DELAY = 800;

export default function Taskbar(props) {
    const runningApps = props.apps.filter(app => props.closed_windows[app.id] === false);
    const [mode] = usePersistentState('app:panel-mode', 'never');
    const [visible, setVisible] = useState(mode !== 'always');
    const hideTimeout = useRef(null);

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

    useEffect(() => {
        setVisible(mode !== 'always');
    }, [mode]);

    useEffect(() => {
        if (mode === 'always') {
            const handleMove = (e) => {
                if (e.clientY >= window.innerHeight - 2) {
                    setVisible(true);
                }
            };
            window.addEventListener('mousemove', handleMove);
            return () => window.removeEventListener('mousemove', handleMove);
        }
    }, [mode]);

    useEffect(() => {
        if (mode === 'always') {
            const bar = document.getElementById('taskbar');
            if (!bar) return;
            const scheduleHide = () => {
                if (hideTimeout.current) clearTimeout(hideTimeout.current);
                hideTimeout.current = setTimeout(() => setVisible(false), HIDE_DELAY);
            };
            const handleEnter = () => {
                if (hideTimeout.current) clearTimeout(hideTimeout.current);
            };
            bar.addEventListener('mouseleave', scheduleHide);
            bar.addEventListener('mouseenter', handleEnter);
            scheduleHide();
            return () => {
                bar.removeEventListener('mouseleave', scheduleHide);
                bar.removeEventListener('mouseenter', handleEnter);
                if (hideTimeout.current) clearTimeout(hideTimeout.current);
            };
        }
    }, [mode]);

    useEffect(() => {
        if (mode === 'intelligent') {
            const handleMax = () => {
                if (hideTimeout.current) clearTimeout(hideTimeout.current);
                hideTimeout.current = setTimeout(() => setVisible(false), 200);
            };
            const handleRest = () => {
                if (hideTimeout.current) clearTimeout(hideTimeout.current);
                hideTimeout.current = setTimeout(() => setVisible(true), 100);
            };
            window.addEventListener('window-maximize', handleMax);
            window.addEventListener('window-restore', handleRest);
            return () => {
                window.removeEventListener('window-maximize', handleMax);
                window.removeEventListener('window-restore', handleRest);
            };
        }
    }, [mode]);

    return (
        <div
            id="taskbar"
            data-visible={visible}
            className={`absolute bottom-0 left-0 w-full h-10 bg-black bg-opacity-50 flex items-center z-40 transform transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
            role="toolbar"
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
        </div>
    );
}
