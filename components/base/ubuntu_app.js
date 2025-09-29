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
                style={combinedStyle}
                className={(this.state.launching ? " app-icon-launch " : "") + (dragging ? " opacity-70 " : "") +
                    " m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus-visible:bg-white focus-visible:bg-opacity-50 focus-visible:border-yellow-700 focus-visible:border-opacity-100 border border-transparent outline-none rounded select-none flex flex-col justify-start items-center text-center font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
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
