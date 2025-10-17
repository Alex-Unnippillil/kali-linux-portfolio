"use client";

import React from 'react';
import type { ReactNode, Ref } from 'react';
import styles from './window.module.css';
import { WindowEditButtons, WindowTopBar } from './window';

type SystemOverlayWindowProps = {
    id: string;
    title: string;
    open: boolean;
    minimized?: boolean;
    maximized?: boolean;
    onMinimize?: () => void;
    onMaximize?: () => void;
    onClose?: () => void;
    allowMaximize?: boolean;
    overlayRef?: Ref<HTMLDivElement>;
    contentRef?: Ref<HTMLDivElement>;
    overlayClassName?: string;
    frameClassName?: string;
    bodyClassName?: string;
    ariaLabel?: string;
    ariaLabelledBy?: string;
    ariaDescribedBy?: string;
    ariaModal?: boolean;
    children: ReactNode;
};

const defaultOverlayState = {
    open: false,
    minimized: false,
    maximized: false,
};

export default function SystemOverlayWindow({
    id,
    title,
    open,
    minimized = defaultOverlayState.minimized,
    maximized = defaultOverlayState.maximized,
    onMinimize,
    onMaximize,
    onClose,
    allowMaximize = true,
    overlayRef,
    contentRef,
    overlayClassName,
    frameClassName,
    bodyClassName,
    ariaLabel,
    ariaLabelledBy,
    ariaDescribedBy,
    ariaModal = true,
    children,
}: SystemOverlayWindowProps) {
    const isActive = open && !minimized;
    const overlayClasses = [
        'fixed inset-0 z-[60] flex items-center justify-center px-4 py-12 sm:py-16',
        overlayClassName,
        isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
    ]
        .filter(Boolean)
        .join(' ');

    const frameClasses = [
        'relative flex h-full max-h-full w-full flex-col overflow-hidden focus:outline-none',
        styles.windowFrame,
        styles.windowFrameActive,
        maximized ? styles.windowFrameMaximized : '',
        minimized ? styles.windowFrameMinimized : '',
        frameClassName,
    ]
        .filter(Boolean)
        .join(' ');

    const bodyClasses = ['flex-1 overflow-auto', bodyClassName].filter(Boolean).join(' ');

    const handleMinimize = () => {
        if (typeof onMinimize === 'function') {
            onMinimize();
        }
    };

    const handleMaximize = () => {
        if (typeof onMaximize === 'function') {
            onMaximize();
        }
    };

    const handleClose = () => {
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    return (
        <div
            ref={overlayRef}
            className={overlayClasses}
            aria-hidden={!isActive}
        >
            <div
                id={id}
                ref={contentRef}
                className={frameClasses}
                role="dialog"
                aria-modal={ariaModal}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                tabIndex={-1}
            >
                <WindowTopBar
                    title={title}
                    onKeyDown={undefined}
                    onBlur={undefined}
                    grabbed={false}
                    onPointerDown={undefined}
                    onDoubleClick={onMaximize ? handleMaximize : undefined}
                    titleId={ariaLabelledBy}
                />
                <WindowEditButtons
                    minimize={handleMinimize}
                    maximize={handleMaximize}
                    isMaximised={Boolean(maximized)}
                    close={handleClose}
                    id={id}
                    allowMaximize={allowMaximize}
                />
                <div className={bodyClasses}>{children}</div>
            </div>
        </div>
    );
}
