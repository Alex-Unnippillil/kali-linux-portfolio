import React, { Component } from 'react'
import Image from 'next/image'
import DelayedTooltip from '../ui/DelayedTooltip'

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

    handleActivate = (event) => {
        if (this.props.disabled) return;

        const dragging = this.state.dragging || this.props.isBeingDragged;
        if (dragging) return;

        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        this.openApp();
    }

    render() {
        const {
            draggable = true,
            isBeingDragged = false,
            onPointerDown,
            onPointerMove,
            onPointerCancel,
            style,
            description,
            hideDescriptionTooltip,
        } = this.props;

        const dragging = this.state.dragging || isBeingDragged;

        const handlePointerUp = (event) => {
            if (typeof this.props.onPointerUp === 'function') {
                this.props.onPointerUp(event);
            }

            if (event?.defaultPrevented) return;

            if (event?.pointerType === 'touch') {
                this.handleActivate(event);
            }
        };

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

        const tooltipId = description && !hideDescriptionTooltip
            ? `app-tooltip-${this.props.id}`
            : undefined;

        const renderContent = ({
            ref,
            onMouseEnter,
            onMouseLeave,
            onFocus,
            onBlur,
        } = {}) => (
            <div
                ref={ref}
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                aria-describedby={tooltipId}
                data-context="app"
                data-app-id={this.props.id}
                draggable={draggable}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={onPointerCancel}
                style={combinedStyle}
                className={(this.state.launching ? " app-icon-launch " : "") + (dragging ? " opacity-70 " : "") +
                    " m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none flex flex-col justify-start items-center text-center font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.openApp(); } }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={(event) => {
                    if (typeof onMouseEnter === 'function') {
                        onMouseEnter(event);
                    }
                    this.handlePrefetch();
                }}
                onMouseLeave={onMouseLeave}
                onFocus={(event) => {
                    if (typeof onFocus === 'function') {
                        onFocus(event);
                    }
                    this.handlePrefetch();
                }}
                onBlur={onBlur}
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
        );

        if (!tooltipId) {
            return renderContent();
        }

        return (
            <DelayedTooltip
                id={tooltipId}
                content={(
                    <div className="flex max-w-xs flex-col gap-1">
                        <span className="text-sm font-semibold text-white">
                            {this.props.displayName || this.props.name}
                        </span>
                        <span className="text-xs leading-relaxed text-gray-200">{description}</span>
                    </div>
                )}
            >
                {(triggerProps) =>
                    renderContent({
                        ref: triggerProps.ref,
                        onMouseEnter: triggerProps.onMouseEnter,
                        onMouseLeave: triggerProps.onMouseLeave,
                        onFocus: triggerProps.onFocus,
                        onBlur: triggerProps.onBlur,
                    })
                }
            </DelayedTooltip>
        )
    }
}

export default UbuntuApp
