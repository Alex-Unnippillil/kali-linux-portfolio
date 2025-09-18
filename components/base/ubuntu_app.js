import React, { Component } from 'react'
import Image from 'next/image'

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false };
    }

    handleDragStart = (event) => {
        if (this.props.disabled) {
            event?.preventDefault();
            return;
        }

        this.setState({ dragging: true });

        if (event?.dataTransfer) {
            try {
                event.dataTransfer.setData('text/plain', this.props.id);
            } catch { }
            event.dataTransfer.effectAllowed = 'move';
        }

        if (typeof this.props.onDragStart === 'function') {
            this.props.onDragStart(this.props.id, event);
        }
    }

    handleDragEnd = (event) => {
        this.setState({ dragging: false });

        if (typeof this.props.onDragEnd === 'function') {
            this.props.onDragEnd(this.props.id, event);
        }
    }

    handleDragEnter = (event) => {
        if (typeof this.props.onDragEnter === 'function') {
            this.props.onDragEnter(this.props.id, event);
        }
    }

    handleDragLeave = (event) => {
        if (typeof this.props.onDragLeave === 'function') {
            this.props.onDragLeave(this.props.id, event);
        }
    }

    handleDrop = (event) => {
        if (typeof this.props.onDrop === 'function') {
            this.props.onDrop(this.props.id, event);
        }
    }

    handleDragOver = (event) => {
        if (typeof this.props.onDragOver === 'function') {
            this.props.onDragOver(this.props.id, event);
        }
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
        const classNames = [
            "drag-animate",
            "cursor-grab active:cursor-grabbing",
            "p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active",
        ];

        if (this.state.launching) classNames.push("app-icon-launch");
        if (this.state.dragging) classNames.push("drag-animate-active", "cursor-grabbing");
        if (this.props.dropTargetReady) classNames.push("drop-target-ready");
        if (this.props.dropTargetActive) classNames.push("drop-target-active");

        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                aria-grabbed={this.state.dragging}
                data-context="app"
                data-app-id={this.props.id}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onDragEnter={this.handleDragEnter}
                onDragLeave={this.handleDragLeave}
                onDrop={this.handleDrop}
                onDragOver={this.handleDragOver}
                className={classNames.join(' ')}
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
                    className="mb-1 w-10"
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
