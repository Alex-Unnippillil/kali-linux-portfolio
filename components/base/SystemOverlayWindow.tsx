"use client";

import React from 'react';
import type { ReactNode, Ref } from 'react';
import styles from './window.module.css';
import { WindowEditButtons, WindowTopBar } from './window';

const FallbackTopBar: React.FC<{
    title: string;
    controls?: ReactNode;
    onDoubleClick?: () => void;
}> = ({ title, controls, onDoubleClick }) => (
    <div
        className="flex items-center justify-between bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        role="banner"
        onDoubleClick={onDoubleClick}
        data-window-titlebar=""
        data-window-drag-handle=""
    >
        <span className="truncate" title={title}>
            {title}
        </span>
        <div className="flex items-center gap-2">{controls}</div>
    </div>
);

const FallbackControls: React.FC<{
    minimize?: () => void;
    maximize?: () => void;
    close?: () => void;
    allowMaximize?: boolean;
}> = ({ minimize, maximize, close, allowMaximize = true }) => (
    <div className="flex items-center gap-2">
        <button type="button" aria-label="Window minimize" onClick={minimize}>
            _
        </button>
        {allowMaximize && (
            <button type="button" aria-label="Window maximize" onClick={maximize}>
                ☐
            </button>
        )}
        <button type="button" aria-label="Window close" onClick={close}>
            ×
        </button>
    </div>
);

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const TopBarComponent = !isTestEnv && WindowTopBar ? WindowTopBar : FallbackTopBar;
const ControlsComponent = WindowEditButtons || FallbackControls;

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
                <TopBarComponent
                    title={title}
                    onKeyDown={undefined}
                    onBlur={undefined}
                    grabbed={false}
                    onPointerDown={undefined}
                    onDoubleClick={onMaximize ? handleMaximize : undefined}
                    controls={(
                        <ControlsComponent
                            minimize={handleMinimize}
                            maximize={handleMaximize}
                            isMaximised={Boolean(maximized)}
                            close={handleClose}
                            id={id}
                            allowMaximize={allowMaximize}
                        />
                    )}
                />
                <div className={bodyClasses}>{children}</div>
            </div>
        </div>
    );
}
