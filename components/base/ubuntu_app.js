import React, { Component } from 'react'
import Image from 'next/image'
import prefetchDynamicImport from '../../utils/prefetchDynamicImport'

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false };
        this.prefetchTimer = null;
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
            prefetchDynamicImport(this.props.prefetch, `/apps/${this.props.id}.js`);
            this.setState({ prefetched: true });
        }
    }

    startPrefetchTimer = () => {
        if (this.state.prefetched || this.prefetchTimer) return;
        this.prefetchTimer = setTimeout(() => {
            this.prefetchTimer = null;
            this.handlePrefetch();
        }, 150);
    }

    clearPrefetchTimer = () => {
        if (this.prefetchTimer) {
            clearTimeout(this.prefetchTimer);
            this.prefetchTimer = null;
        }
    }

    componentWillUnmount() {
        this.clearPrefetchTimer();
    }

    render() {
        return (
            <button
                type="button"
                aria-label={this.props.name}
                disabled={this.props.disabled}
                data-context="app"
                data-app-id={this.props.id}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={(this.state.launching ? " app-icon-launch " : "") + (this.state.dragging ? " opacity-70 " : "") +
                    " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : (this.props.tabIndex ?? 0)}
                onMouseEnter={this.startPrefetchTimer}
                onMouseLeave={this.clearPrefetchTimer}
                onFocus={(e) => { this.startPrefetchTimer(); this.props.onFocus && this.props.onFocus(e); }}
                onBlur={this.clearPrefetchTimer}
            >
                <Image
                    width={40}
                    height={40}
                    className="mb-1 w-10"
                    src={this.props.icon.replace('./', '/')}
                    alt={"Kali " + this.props.name}
                    sizes="40px"
                />
                {this.props.displayName || this.props.name}

            </button>
        )
    }
}

export default UbuntuApp
