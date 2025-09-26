import React, { Component } from 'react'
import Image from 'next/image'

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false, ripple: null };
        this.lastInteraction = 0;
        this.rippleTimeout = null;
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

    handleClick = (event) => {
        if (this.props.disabled) return;
        const now = Date.now();
        if (now - this.lastInteraction < 250) {
            return;
        }
        this.lastInteraction = now;

        if (this.rippleTimeout) {
            clearTimeout(this.rippleTimeout);
        }

        const container = event.currentTarget;
        const rect = container.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const left = event.clientX - rect.left - size / 2;
        const top = event.clientY - rect.top - size / 2;

        this.setState({
            ripple: {
                size,
                left,
                top,
                key: now,
            }
        }, () => {
            this.rippleTimeout = setTimeout(() => {
                this.setState({ ripple: null });
            }, 450);
        });
    }

    handlePrefetch = () => {
        if (!this.state.prefetched && typeof this.props.prefetch === 'function') {
            this.props.prefetch();
            this.setState({ prefetched: true });
        }
    }

    componentWillUnmount() {
        if (this.rippleTimeout) {
            clearTimeout(this.rippleTimeout);
        }
    }

    render() {
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
                className={(this.state.launching ? " app-icon-launch " : "") + (this.state.dragging ? " opacity-70 " : "") +
                    " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active relative overflow-hidden "}
                id={"app-" + this.props.id}
                onClick={this.handleClick}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
            >
                {this.state.ripple && (
                    <span
                        key={this.state.ripple.key}
                        className="ubuntu-app__ripple"
                        style={{
                            width: this.state.ripple.size,
                            height: this.state.ripple.size,
                            left: this.state.ripple.left,
                            top: this.state.ripple.top,
                        }}
                    />
                )}
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
