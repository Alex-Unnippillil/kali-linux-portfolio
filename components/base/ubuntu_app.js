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
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(this.props.id);
        }
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
            onKeyDown: customKeyDown,
            onBlur,
            onFocus,
            assistiveHint,
            assistiveHintId,
            isSelected = false,
            isHovered = false,
            accentVariables = {},
            launchOnClick = false,
        } = this.props;

        const dragging = this.state.dragging || isBeingDragged;

        const hintId = assistiveHint ? (assistiveHintId || `app-${this.props.id}-instructions`) : undefined;

        const handlePointerUp = (event) => {
            if (typeof this.props.onPointerUp === 'function') {
                this.props.onPointerUp(event);
            }

            if (event?.defaultPrevented) return;

            if (event?.pointerType === 'touch') {
                this.handleActivate(event);
            }
        };

        const stateStyle = {};
        if (isSelected) {
            stateStyle.background = 'var(--desktop-icon-selection-bg, rgba(56, 189, 248, 0.18))';
            stateStyle.boxShadow = 'var(--desktop-icon-selection-glow, 0 0 0 1px rgba(56,189,248,0.7), 0 4px 16px rgba(15,118,110,0.45))';
            stateStyle.borderColor = 'var(--desktop-icon-selection-border, rgba(165, 243, 252, 0.9))';
            stateStyle.fontWeight = 600;
        } else if (isHovered) {
            stateStyle.background = 'var(--desktop-icon-hover-bg, rgba(56, 189, 248, 0.12))';
            stateStyle.borderColor = 'var(--desktop-icon-hover-border, rgba(165, 243, 252, 0.35))';
        }

        const combinedStyle = {
            ...accentVariables,
            ...style,
            width: 'var(--desktop-icon-width, 6rem)',
            minWidth: 'var(--desktop-icon-width, 6rem)',
            minHeight: 'var(--desktop-icon-height, 5.5rem)',
            height: 'auto',
            padding: 'var(--desktop-icon-padding, 0.25rem)',
            fontSize: 'var(--desktop-icon-font-size, 0.75rem)',
            gap: 'var(--desktop-icon-gap, 0.375rem)',
            borderColor: 'transparent',
            ...stateStyle,
        };

        const labelStyle = {
            textShadow: '0 1px 3px rgba(0,0,0,0.75)',
            lineHeight: 'var(--desktop-icon-line-height, 1.1rem)',
            ...style,
        };

        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                aria-pressed={isSelected ? 'true' : 'false'}
                data-context="app"
                data-app-id={this.props.id}
                draggable={draggable}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={onPointerCancel}
                onClick={(event) => {
                    if (typeof this.props.onClick === 'function') {
                        this.props.onClick(event);
                        if (event.defaultPrevented) return;
                    }
                    if (launchOnClick) {
                        this.handleActivate(event);
                    }
                }}
                style={combinedStyle}
                className={(this.state.launching ? " app-icon-launch " : "") + (dragging ? " opacity-70 " : "") +
                    " m-px z-10 outline-none rounded select-none flex flex-col justify-start items-center text-center text-white transition-colors transition-shadow duration-150 ease-out border focus-visible:ring-2 focus-visible:ring-sky-300/70 "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(event) => {
                    if (typeof customKeyDown === 'function') {
                        customKeyDown(event);
                        if (event.defaultPrevented) {
                            return;
                        }
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.openApp();
                    }
                }}
                onFocus={(event) => {
                    this.handlePrefetch();
                    if (typeof onFocus === 'function') {
                        onFocus(event);
                    }
                }}
                onBlur={onBlur}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                aria-describedby={hintId}
            >
                <Image
                    width={48}
                    height={48}
                    className="mb-1"
                    style={{
                        width: 'var(--desktop-icon-image, 2.5rem)',
                        height: 'var(--desktop-icon-image, 2.5rem)',
                        maxWidth: 'var(--desktop-icon-image, 2.5rem)',
                        maxHeight: 'var(--desktop-icon-image, 2.5rem)'
                    }}
                    src={this.props.icon.replace('./', '/')}
                    alt={"Kali " + this.props.name}
                    sizes="(max-width: 768px) 48px, 64px"
                />
                <span
                    className={"leading-tight " + (isSelected ? "font-semibold" : "font-normal")}
                    style={labelStyle}
                >
                    {this.props.displayName || this.props.name}
                </span>

                {assistiveHint ? (
                    <span id={hintId} className="sr-only">
                        {assistiveHint}
                    </span>
                ) : null}

            </div>
        )
    }
}

export default UbuntuApp
