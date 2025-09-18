import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from 'next/image';
import { toCanvas } from 'html-to-image';
import useTooltip from '../../hooks/useTooltip';

const BADGE_SUPPORT = typeof navigator !== 'undefined' && 'setAppBadge' in navigator && 'clearAppBadge' in navigator;

const getCount = (value) => {
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'number') return value;
    return 0;
};

const useAppBadge = (notifications, tasks) => {
    const notificationsCount = useMemo(() => getCount(notifications), [notifications]);
    const tasksCount = useMemo(() => getCount(tasks), [tasks]);

    useEffect(() => {
        if (!BADGE_SUPPORT) return;
        const count = notificationsCount + tasksCount;
        if (count > 0 && navigator.setAppBadge) {
            navigator.setAppBadge(count).catch(() => { });
        } else if (navigator.clearAppBadge) {
            navigator.clearAppBadge().catch(() => { });
        }
    }, [notificationsCount, tasksCount]);
};

const useScaleImage = () => {
    const [scale, setScale] = useState(false);
    const timerRef = useRef(null);

    const trigger = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setScale(true);
        timerRef.current = setTimeout(() => {
            setScale(false);
            timerRef.current = null;
        }, 1000);
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return [scale, trigger];
};

const captureWindowThumbnail = async (id) => {
    if (typeof document === 'undefined') return null;
    const win = document.getElementById(id);
    if (!win) return null;

    const canvas = win.querySelector('canvas');
    if (canvas && typeof canvas.toDataURL === 'function') {
        try {
            return canvas.toDataURL();
        } catch (e) {
            // ignore canvas taint errors
        }
    }

    try {
        const temp = await toCanvas(win);
        return temp.toDataURL();
    } catch (e) {
        return null;
    }
};

export default function SideBarApp(props) {
    const {
        id,
        title,
        icon,
        isClose,
        isFocus,
        isMinimized,
        openApp,
        notifications,
        tasks,
    } = props;

    const tooltip = useTooltip();
    const { visible, getTriggerProps, hideImmediate } = tooltip;
    const [thumbnail, setThumbnail] = useState(null);
    const [scaleImage, triggerScaleImage] = useScaleImage();
    const mountedRef = useRef(true);

    useAppBadge(notifications, tasks);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const handleOpen = useCallback(() => {
        if (!isMinimized?.[id] && isClose?.[id]) {
            triggerScaleImage();
        }
        if (typeof openApp === 'function') {
            openApp(id);
        }
        hideImmediate();
        setThumbnail(null);
    }, [hideImmediate, id, isClose, isMinimized, openApp, triggerScaleImage]);

    const handleCapture = useCallback(async () => {
        const dataUrl = await captureWindowThumbnail(id);
        if (dataUrl && mountedRef.current) {
            setThumbnail(dataUrl);
        }
    }, [id]);

    const handleHide = useCallback(() => {
        setThumbnail(null);
    }, []);

    const triggerProps = getTriggerProps({
        onMouseEnter: () => { void handleCapture(); },
        onFocus: () => { void handleCapture(); },
        onMouseLeave: handleHide,
        onBlur: handleHide,
    });

    const isOpen = isClose?.[id] === false;
    const isFocused = isFocus?.[id];

    const buttonClasses = `${isOpen && isFocused ? "bg-white bg-opacity-10 " : ""}` +
        " w-auto p-2 outline-none relative hover:bg-white hover:bg-opacity-10 rounded m-1 transition-hover transition-active";

    return (
        <button
            type="button"
            aria-label={title}
            data-context="app"
            data-app-id={id}
            onClick={handleOpen}
            className={buttonClasses}
            id={`sidebar-${id}`}
            {...triggerProps}
        >
            <Image
                width={28}
                height={28}
                className="w-7"
                src={icon.replace('./', '/')}
                alt="Ubuntu App Icon"
                sizes="28px"
            />
            <Image
                width={28}
                height={28}
                className={`${scaleImage ? " scale " : ""} scalable-app-icon w-7 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
                src={icon.replace('./', '/')}
                alt=""
                sizes="28px"
            />
            {isOpen && !isFocused && (
                <div className=" w-2 h-1 absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white rounded-md"></div>
            )}
            {thumbnail && (
                <div
                    className={`${visible ? " visible " : " invisible "}` +
                    " pointer-events-none absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2" +
                    " rounded border border-gray-400 border-opacity-40 shadow-lg overflow-hidden bg-black bg-opacity-50"}
                >
                    <Image
                        width={128}
                        height={80}
                        src={thumbnail}
                        alt={`Preview of ${title}`}
                        className="w-32 h-20 object-cover"
                        sizes="128px"
                    />
                </div>
            )}
            <div
                className={`${visible ? " visible " : " invisible "}` +
                " w-max py-0.5 px-1.5 absolute top-1.5 left-full ml-3 m-1 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md"}
            >
                {title}
            </div>
        </button>
    );
}
