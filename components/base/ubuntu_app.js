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

    handleMouseDown = (event) => {
        if (this.props.disabled) return;
        if (typeof this.props.onSelect === 'function') {
            this.props.onSelect(this.props.id, {
                additive: event.ctrlKey || event.metaKey,
            });
        }
    }

    handleFocus = () => {
        if (this.props.disabled) return;
        if (typeof this.props.onSelect === 'function') {
            this.props.onSelect(this.props.id);
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
        const selectedClass = this.props.selected
            ? ' bg-white bg-opacity-20 border-yellow-500 border-opacity-70 '
            : '';
        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                aria-pressed={this.props.selected}
                data-context="app"
                data-app-id={this.props.id}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onMouseDown={this.handleMouseDown}
                className={(this.state.launching ? " app-icon-launch " : "") + (this.state.dragging ? " opacity-70 " : "") +
                    selectedClass +
                    " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={() => { this.handlePrefetch(); this.handleFocus(); }}
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
