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
            assistiveHint,
            assistiveHintId,
            isSelected = false,
        } = this.props;

        const dragging = this.state.dragging || isBeingDragged;
        const selected = Boolean(isSelected);

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

        if (selected) {
            combinedStyle.backgroundColor = 'rgba(59, 130, 246, 0.28)';
            if (!style || typeof style.boxShadow === 'undefined') {
                combinedStyle.boxShadow = '0 0 0 1px rgba(147, 197, 253, 0.55)';
            }
        } else if (!style || typeof style.boxShadow === 'undefined') {
            delete combinedStyle.boxShadow;
        }

        const classNames = [
            this.state.launching ? 'app-icon-launch' : null,
            dragging ? 'opacity-70' : null,
            'm-px',
            'z-10',
            'bg-white',
            'bg-opacity-0',
            'hover:bg-opacity-20',
            'focus:bg-white',
            'focus:bg-opacity-50',
            'focus:border-yellow-700',
            'focus:border-opacity-100',
            'border',
            'outline-none',
            'rounded',
            'select-none',
            'flex',
            'flex-col',
            'justify-start',
            'items-center',
            'text-center',
            'font-normal',
            'text-white',
            'transition-hover',
            'transition-active',
            selected ? 'border-blue-300 bg-blue-500/30' : 'border-transparent',
        ].filter(Boolean).join(' ');

        return (
            <div
                role="option"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                aria-selected={selected ? 'true' : 'false'}
                data-context="app"
                data-app-id={this.props.id}
                data-selected={selected ? 'true' : 'false'}
                draggable={draggable}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={onPointerCancel}
                style={combinedStyle}
                className={classNames}
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
                onBlur={onBlur}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
                aria-describedby={hintId}
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
