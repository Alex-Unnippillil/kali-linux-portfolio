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
        const { launching, dragging } = this.state
        const { disabled } = this.props

        const cardClasses = [
            launching ? 'app-icon-launch' : '',
            dragging ? 'opacity-70' : '',
            'p-1 m-px z-10 bg-white/0 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active',
            'hover:bg-[var(--kali-accent)]/15 focus:bg-[var(--kali-accent)]/20 focus:ring-2 focus:ring-[var(--kali-focus-ring)] focus:ring-offset-2 focus:ring-offset-transparent'
        ]

        if (disabled) {
            cardClasses.push('opacity-40 cursor-not-allowed hover:bg-transparent focus:bg-transparent focus:ring-0 focus:ring-offset-0')
        }

        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={disabled}
                data-context="app"
                data-app-id={this.props.id}
                draggable
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={cardClasses.filter(Boolean).join(' ')}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={disabled ? -1 : 0}
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
