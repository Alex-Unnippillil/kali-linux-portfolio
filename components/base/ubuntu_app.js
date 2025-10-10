import React, { Component } from 'react'
import Image from 'next/image'

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false };
    }

    handleDragStart = () => {
        this.setState({ dragging: true });
    }

    handleDragEnd = () => {
        this.setState({ dragging: false });
    }

    openApp = () => {
        if (this.props.disabled) return;
        this.setState({ launching: true }, () => {
            setTimeout(() => this.setState({ launching: false }), 300);
        });
        this.props.openApp(this.props.id);
    }

    handlePrefetch = () => {
        if (!this.state.prefetched && typeof this.props.prefetch === 'function') {
            this.props.prefetch();
            this.setState({ prefetched: true });
        }
    }

    handleActivate = (event) => {
        if (this.props.disabled) return;

        const dragging = this.state.dragging || this.props.isBeingDragged;
        if (dragging) return;

        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        this.openApp();
    }

    render() {
        const {
            draggable = true,
            isBeingDragged = false,
            onPointerDown,
            onPointerMove,
            onPointerCancel,
            style,
            isRunning = false,
            isMinimized = false,
        } = this.props;

        const dragging = this.state.dragging || isBeingDragged;

        const running = Boolean(isRunning);
        const minimized = running && Boolean(isMinimized);
        const badgeVariant = running ? (minimized ? 'minimized' : 'running') : null;
        const statusLabel = badgeVariant === 'minimized'
            ? 'Running (minimized)'
            : badgeVariant === 'running'
                ? 'Running'
                : '';

        const handlePointerUp = (event) => {
            if (typeof this.props.onPointerUp === 'function') {
                this.props.onPointerUp(event);
            }

            if (event?.defaultPrevented) return;

            if (event?.pointerType === 'touch') {
                this.handleActivate(event);
            }
        };

        const combinedStyle = {
            width: 'var(--desktop-icon-width, 6rem)',
            minWidth: 'var(--desktop-icon-width, 6rem)',
            height: 'var(--desktop-icon-height, 5.5rem)',
            minHeight: 'var(--desktop-icon-height, 5.5rem)',
            padding: 'var(--desktop-icon-padding, 0.25rem)',
            fontSize: 'var(--desktop-icon-font-size, 0.75rem)',
            gap: 'var(--desktop-icon-gap, 0.375rem)',
            ...style,
        };

        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                data-context="app"
                data-app-id={this.props.id}
                draggable={draggable}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={onPointerCancel}
                style={combinedStyle}
                className={(this.state.launching ? " app-icon-launch " : "") + (dragging ? " opacity-70 " : "") +
                    " m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none flex flex-col justify-start items-center text-center font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
            >
                <div className="relative mb-1 inline-flex items-center justify-center">
                    <Image
                        width={48}
                        height={48}
                        className="block"
                        style={{
                            width: 'var(--desktop-icon-image, 2.5rem)',
                            height: 'var(--desktop-icon-image, 2.5rem)'
                        }}
                        src={this.props.icon.replace('./', '/')}
                        alt={"Kali " + this.props.name}
                        sizes="(max-width: 768px) 48px, 64px"
                    />
                    {badgeVariant ? (
                        <>
                            <div
                                className="absolute bottom-1 right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/70 bg-black/80 shadow-sm"
                                aria-hidden="true"
                                data-testid="ubuntu-app-status-badge"
                                data-variant={badgeVariant}
                            >
                                {badgeVariant === 'running' ? (
                                    <span className="block h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
                                ) : (
                                    <svg
                                        viewBox="0 0 12 12"
                                        className="h-2.5 w-2.5 text-white"
                                        aria-hidden="true"
                                    >
                                        <rect x="2" y="2" width="3" height="8" rx="0.75" fill="currentColor" />
                                        <rect x="7" y="2" width="3" height="8" rx="0.75" fill="currentColor" />
                                    </svg>
                                )}
                            </div>
                            <span className="sr-only">Status: {statusLabel}</span>
                        </>
                    ) : null}
                </div>
                {this.props.displayName || this.props.name}

            </div>
        )
    }
}

export default UbuntuApp
