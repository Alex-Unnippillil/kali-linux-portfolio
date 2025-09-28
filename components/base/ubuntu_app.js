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
            id,
            name,
            icon,
            displayName,
            disabled,
            tabIndex,
            isActive = false,
            ariaSelected = false,
            onFocus,
            onMouseDown,
        } = this.props

        const computedTabIndex = disabled ? -1 : typeof tabIndex === 'number' ? tabIndex : 0
        const activationKeys = ['Enter', ' ', 'Spacebar']

        return (
            <div
                role="option"
                aria-label={name}
                aria-disabled={disabled}
                aria-selected={ariaSelected}
                data-context="app"
                data-app-id={id}
                data-active={isActive ? 'true' : 'false'}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={`p-1 m-px z-10 rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition hover:bg-white hover:bg-opacity-20 outline-none border border-transparent bg-white bg-opacity-0 transition-hover transition-active ${
                    this.state.launching ? 'app-icon-launch' : ''
                } ${this.state.dragging ? 'opacity-70' : ''} ${
                    isActive
                        ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-black bg-opacity-10'
                        : 'focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:bg-white focus-visible:bg-opacity-10'
                }`}
                id={`app-${id}`}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => {
                    if (activationKeys.includes(e.key)) {
                        e.preventDefault()
                        this.openApp()
                    }
                }}
                tabIndex={computedTabIndex}
                onMouseEnter={this.handlePrefetch}
                onFocus={(event) => {
                    this.handlePrefetch()
                    if (typeof onFocus === 'function') onFocus(event)
                }}
                onMouseDown={onMouseDown}
            >
                <Image
                    width={40}
                    height={40}
                    className="mb-1 w-10"
                    src={icon.replace('./', '/')}
                    alt={`Kali ${name}`}
                    sizes="40px"
                />
                {displayName || name}

            </div>
        )
    }
}

export default UbuntuApp
