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
        const size = this.props.iconSize || 1;
        const labelPos = this.props.labelPosition || 'bottom';
        const iconPx = 40 * size;
        const containerStyle = {
            width: labelPos === 'bottom' ? 96 * size : 120 * size,
            height: labelPos === 'bottom' ? 80 * size : 48 * size,
            fontSize: `${12 * size}px`
        };
        const containerClass =
            (this.state.launching ? " app-icon-launch " : "") +
            (this.state.dragging ? " opacity-70 " : "") +
            " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none flex transition-hover transition-active " +
            (labelPos === 'right' ? ' flex-row justify-start items-center text-left w-auto h-auto' : ' flex-col justify-start items-center text-center');
        const imageClass = labelPos === 'right' ? 'mr-2' : 'mb-1';
        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                data-context="app"
                data-app-id={this.props.id}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={containerClass}
                style={containerStyle}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
            >
                <Image
                    width={iconPx}
                    height={iconPx}
                    className={`w-10 ${imageClass}`}
                    style={{ width: iconPx, height: iconPx }}
                    src={this.props.icon.replace('./', '/')}
                    alt={"Kali " + this.props.name}
                    sizes={`${iconPx}px`}
                />
                {this.props.displayName || this.props.name}
            </div>
        )
    }
}

export default UbuntuApp
