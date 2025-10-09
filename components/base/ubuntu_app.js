import React, { Component } from 'react'
import Image from 'next/image'

const DEFAULT_PREFETCH_INDICATOR = (
    <span
        data-testid="prefetch-indicator"
        className="mt-1 text-[0.625rem] font-medium tracking-wide text-cyan-100 opacity-90 animate-pulse"
        role="status"
        aria-live="polite"
    >
        Prefetching…
    </span>
)

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false, prefetching: false };
        this._isUnmounted = false;
    }

    componentWillUnmount() {
        this._isUnmounted = true;
    }

    safeSetState = (updater) => {
        if (this._isUnmounted) return;
        this.setState(updater);
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
        if (this.state.prefetched || this.state.prefetching) return;

        if (typeof this.props.prefetch === 'function') {
            this.safeSetState({ prefetching: true });

            let prefetchResult;

            try {
                prefetchResult = this.props.prefetch();
            } catch (error) {
                this.safeSetState({ prefetching: false });
                return;
            }

            const markComplete = (didPrefetch) => {
                if (didPrefetch) {
                    this.safeSetState({ prefetched: true, prefetching: false });
                } else {
                    this.safeSetState({ prefetching: false });
                }
            };

            if (prefetchResult && typeof prefetchResult.then === 'function') {
                prefetchResult
                    .then(() => markComplete(true))
                    .catch(() => markComplete(false));
            } else {
                markComplete(true);
            }
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
            prefetchIndicator,
        } = this.props;

        const dragging = this.state.dragging || isBeingDragged;

        const shouldShowPrefetchIndicator = this.state.prefetching && !this.state.prefetched;

        const indicatorContent =
            Object.prototype.hasOwnProperty.call(this.props, 'prefetchIndicator')
                ? prefetchIndicator
                : DEFAULT_PREFETCH_INDICATOR;

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
                aria-busy={shouldShowPrefetchIndicator || undefined}
                data-prefetching={shouldShowPrefetchIndicator ? 'true' : undefined}
            >
                <Image
                    width={48}
                    height={48}
                    className="mb-1"
                    style={{
                        width: 'var(--desktop-icon-image, 2.5rem)',
                        height: 'var(--desktop-icon-image, 2.5rem)'
                    }}
                    src={this.props.icon.replace('./', '/')}
                    alt={"Kali " + this.props.name}
                    sizes="(max-width: 768px) 48px, 64px"
                />
                {this.props.displayName || this.props.name}
                {shouldShowPrefetchIndicator && indicatorContent}
            </div>
        )
    }
}

export default UbuntuApp
