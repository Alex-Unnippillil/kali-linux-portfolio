import React, { Component } from 'react'
import Image from 'next/image'

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false };
    }

    handleSelect = (event) => {
        if (typeof this.props.onSelect === 'function') {
            this.props.onSelect(event, this.props.id);
        }
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
        const selected = Boolean(this.props.selected);
        const baseClass = " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active ";
        const launching = this.state.launching ? " app-icon-launch " : "";
        const dragging = this.state.dragging ? " opacity-70 " : "";
        const selectedClass = selected ? " bg-opacity-20 border-blue-400 border " : "";

        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                aria-selected={selected}
                data-context="app"
                data-app-id={this.props.id}
                data-selected={selected ? 'true' : 'false'}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={`${launching}${dragging}${selectedClass}${baseClass}`}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onClick={this.handleSelect}
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
