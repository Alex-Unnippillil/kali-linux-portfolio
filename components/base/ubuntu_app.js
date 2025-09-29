import React, { Component } from 'react'
import Image from 'next/image'
import Router from 'next/router'

const prefetchedRoutes = new Set()

const scheduleIdleTask = (callback) => {
    if (typeof window === 'undefined') return () => { }

    if (window?.scheduler?.postTask) {
        if (typeof AbortController === 'function') {
            const controller = new AbortController()
            window.scheduler.postTask(() => {
                callback()
            }, { priority: 'background', signal: controller.signal }).catch(() => { })
            return () => controller.abort()
        }

        window.scheduler.postTask(() => {
            callback()
        }, { priority: 'background' }).catch(() => { })
        return () => { }
    }

    if (typeof window.requestIdleCallback === 'function') {
        const id = window.requestIdleCallback(() => {
            callback()
        }, { timeout: 1500 })
        return () => window.cancelIdleCallback(id)
    }

    const timeout = window.setTimeout(callback, 200)
    return () => window.clearTimeout(timeout)
}

const computeObserverOptions = () => {
    if (typeof window === 'undefined') return null
    const isCoarsePointer = (() => {
        if (typeof window.matchMedia !== 'function') return false
        try {
            return window.matchMedia('(pointer: coarse)').matches
        } catch (error) {
            console.warn('Failed to evaluate pointer media query', error)
            return false
        }
    })()

    return {
        rootMargin: isCoarsePointer ? '0px 0px 48px 0px' : '0px 0px 160px 0px',
        threshold: isCoarsePointer ? 0.6 : 0.2,
    }
}

const prefetchRoute = (route) => {
    if (typeof window === 'undefined') return
    if (!route || prefetchedRoutes.has(route)) return
    if (typeof Router?.prefetch !== 'function') return

    Router.prefetch(route).catch(() => {
        prefetchedRoutes.delete(route)
    })
    prefetchedRoutes.add(route)
}

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false };
        this.iconRef = React.createRef();
        this.cancelScheduledPrefetch = null;
        this.intersectionObserver = null;
        this._isMounted = false;
        this.lastPrefetchSource = null;
        this.prefetchedFlag = false;
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

    componentDidMount() {
        this._isMounted = true;
        this.setupPrefetchObserver();
    }

    componentDidUpdate(prevProps) {
        if (this.props.prefetch !== prevProps.prefetch || this.props.prefetchRoute !== prevProps.prefetchRoute) {
            this.prefetchedFlag = false;
            this.cancelPendingPrefetch();
            this.teardownPrefetchObserver();
            this.setupPrefetchObserver();
        }
    }

    componentWillUnmount() {
        this._isMounted = false;
        this.cancelPendingPrefetch();
        this.teardownPrefetchObserver();
    }

    setupPrefetchObserver = () => {
        if (this.props.disabled) return;
        const hasPrefetchHandler = typeof this.props.prefetch === 'function' || typeof this.props.prefetchRoute === 'string';
        if (!hasPrefetchHandler || typeof window === 'undefined') return;

        const target = this.iconRef.current;
        if (!target) return;

        const options = computeObserverOptions();
        if (typeof window.IntersectionObserver !== 'function' || !options) {
            this.schedulePrefetch('immediate');
            return;
        }

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.schedulePrefetch('intersection');
                }
            });
        }, options);

        try {
            this.intersectionObserver.observe(target);
        } catch (error) {
            console.warn('Failed to observe desktop app icon for prefetch', error);
            this.schedulePrefetch('immediate');
        }
    }

    teardownPrefetchObserver = () => {
        if (this.intersectionObserver) {
            try {
                const target = this.iconRef.current;
                if (target) this.intersectionObserver.unobserve(target);
                this.intersectionObserver.disconnect();
            } catch (error) {
                console.warn('Failed to disconnect prefetch observer', error);
            }
        }
        this.intersectionObserver = null;
    }

    cancelPendingPrefetch = () => {
        if (typeof this.cancelScheduledPrefetch === 'function') {
            this.cancelScheduledPrefetch();
        }
        this.cancelScheduledPrefetch = null;
    }

    schedulePrefetch = (source = 'idle') => {
        if (this.prefetchedFlag) return;
        if (this.cancelScheduledPrefetch) return;
        this.lastPrefetchSource = source;
        this.cancelScheduledPrefetch = scheduleIdleTask(() => {
            this.cancelScheduledPrefetch = null;
            this.executePrefetch();
        });
    }

    executePrefetch = () => {
        if (this.prefetchedFlag) return;

        const { prefetch, prefetchRoute: route } = this.props;
        try {
            if (typeof prefetch === 'function') {
                prefetch();
            }
        } catch (error) {
            console.warn('Desktop app prefetch handler failed', error);
        }

        if (typeof route === 'string' && route) {
            prefetchRoute(route);
        }

        if (typeof window !== 'undefined') {
            const timestamp = typeof window.performance?.now === 'function'
                ? window.performance.now()
                : Date.now();
            const log = window.__DESKTOP_PREFETCH_LOG__ || [];
            log.push({
                id: this.props.id,
                route: route || null,
                source: this.lastPrefetchSource || 'unknown',
                timestamp,
            });
            window.__DESKTOP_PREFETCH_LOG__ = log;
        }

        this.lastPrefetchSource = null;
        this.prefetchedFlag = true;
        this.teardownPrefetchObserver();
    }

    handleFocusPrefetch = () => {
        if (this.prefetchedFlag) return;
        this.schedulePrefetch('focus');
    }

    render() {
        const {
            draggable = true,
            isBeingDragged = false,
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
            style,
        } = this.props;

        const dragging = this.state.dragging || isBeingDragged;

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
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                ref={this.iconRef}
                style={combinedStyle}
                className={(this.state.launching ? " app-icon-launch " : "") + (dragging ? " opacity-70 " : "") +
                    " m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none flex flex-col justify-start items-center text-center font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onFocus={this.handleFocusPrefetch}
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

            </div>
        )
    }
}

export default UbuntuApp
