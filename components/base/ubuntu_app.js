import React, { Component } from 'react'
import Image from 'next/image'

const LONG_PRESS_DURATION = 600

export class UbuntuApp extends Component {
    longPressTimer = null

    longPressPoint = null

    longPressTarget = null

    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false };
    }

    handleDragStart = () => {
        this.clearLongPressTimer();
        this.setState({ dragging: true });
    }

    handleDragEnd = () => {
        this.setState({ dragging: false });
        this.clearLongPressTimer();
    }

    openApp = () => {
        if (this.props.disabled) return;
        this.setState({ launching: true }, () => {
            setTimeout(() => this.setState({ launching: false }), 300);
        });
        this.props.openApp(this.props.id);
    }

    componentWillUnmount() {
        this.clearLongPressTimer();
    }

    clearLongPressTimer = () => {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        this.longPressPoint = null;
        this.longPressTarget = null;
    }

    emitContextMenu = (trigger, coords, target) => {
        if (this.props.disabled || typeof window === 'undefined') return;
        this.clearLongPressTimer();
        const element = target || document.getElementById(`app-${this.props.id}`);
        const rect = element ? element.getBoundingClientRect() : null;
        const x = coords && typeof coords.x === 'number'
            ? coords.x
            : rect
                ? rect.left + rect.width / 2
                : 0;
        const y = coords && typeof coords.y === 'number'
            ? coords.y
            : rect
                ? rect.top + rect.height / 2
                : 0;

        const favoriteLabel = this.props.isFavorite ? 'Remove Favorite' : 'Add Favorite';
        const pinLabel = this.props.isPinned ? 'Unpin from Panel' : 'Pin to Panel';

        const detail = {
            id: this.props.id,
            name: this.props.name,
            displayName: this.props.displayName || this.props.name,
            icon: this.props.icon,
            trigger,
            position: { x, y },
            rect,
            isFavorite: !!this.props.isFavorite,
            isPinned: !!this.props.isPinned,
            actions: [
                {
                    id: this.props.isFavorite ? 'remove-favorite' : 'add-favorite',
                    label: favoriteLabel,
                    perform: () => {
                        if (this.props.onToggleFavorite) {
                            this.props.onToggleFavorite(this.props.id, !this.props.isFavorite);
                        }
                    },
                },
                {
                    id: this.props.isPinned ? 'unpin-panel' : 'pin-panel',
                    label: pinLabel,
                    perform: () => {
                        if (this.props.onTogglePin) {
                            this.props.onTogglePin(this.props.id, !this.props.isPinned);
                        }
                    },
                },
                {
                    id: 'open-new-window',
                    label: 'Open New Window',
                    perform: () => {
                        if (this.props.onOpenNewWindow) {
                            this.props.onOpenNewWindow(this.props.id);
                        }
                    },
                },
            ],
        };

        window.dispatchEvent(new CustomEvent('ubuntu-app-context', { detail }));
    }

    handleContextMenu = (event) => {
        if (this.props.disabled) return;
        this.emitContextMenu('contextmenu', { x: event.pageX, y: event.pageY }, event.currentTarget);
    }

    handlePointerDown = (event) => {
        if (this.props.disabled) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        this.clearLongPressTimer();
        this.longPressTarget = event.currentTarget;
        this.longPressPoint = { x: event.pageX, y: event.pageY };
        this.longPressTimer = setTimeout(() => {
            this.emitContextMenu('long-press', this.longPressPoint, this.longPressTarget);
        }, LONG_PRESS_DURATION);
    }

    handlePointerEnd = () => {
        this.clearLongPressTimer();
    }

    handlePrefetch = () => {
        if (!this.state.prefetched && typeof this.props.prefetch === 'function') {
            this.props.prefetch();
            this.setState({ prefetched: true });
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
                onContextMenu={this.handleContextMenu}
                onPointerDown={this.handlePointerDown}
                onPointerUp={this.handlePointerEnd}
                onPointerLeave={this.handlePointerEnd}
                onPointerCancel={this.handlePointerEnd}
                className={(this.state.launching ? " app-icon-launch " : "") + (this.state.dragging ? " opacity-70 " : "") +
                    " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
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
