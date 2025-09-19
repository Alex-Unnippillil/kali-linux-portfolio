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

    render() {
        const isList = this.props.viewMode === 'list'
        const classes = [
            this.state.launching ? 'app-icon-launch' : '',
            this.state.dragging ? 'opacity-70' : '',
            'p-1 m-px z-10 select-none text-white font-normal transition-hover transition-active border border-transparent outline-none rounded',
            'focus:border-yellow-700 focus:border-opacity-100',
            this.props.selected ? 'bg-white bg-opacity-20 border-blue-500 border-opacity-60' : 'bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50',
            isList ? 'w-64 max-w-xs h-auto flex flex-row items-center gap-3 px-3 py-2 text-left text-sm' : 'w-24 h-20 flex flex-col justify-start items-center text-center text-xs'
        ].filter(Boolean).join(' ')

        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                aria-selected={this.props.selected}
                data-view-mode={this.props.viewMode}
                data-context="app"
                data-app-id={this.props.id}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={classes}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
            >
                <Image
                    width={40}
                    height={40}
                    className={isList ? 'w-10' : 'mb-1 w-10'}
                    src={this.props.icon.replace('./', '/')}
                    alt={"Kali " + this.props.name}
                    sizes="40px"
                />
                {this.props.displayName || this.props.name}

            </div>
        )
    }
}

export default UbuntuApp
