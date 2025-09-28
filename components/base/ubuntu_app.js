import React, { Component } from 'react'
import Image from 'next/image'

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false };
    }

    handleDragStart = (event) => {
        if (this.props.renaming) return;
        if (event && event.dataTransfer) {
            event.dataTransfer.setData('text/plain', this.props.id);
            event.dataTransfer.effectAllowed = 'move';
        }
        this.setState({ dragging: true });
        if (typeof this.props.onDragStart === 'function') {
            this.props.onDragStart(this.props.id);
        }
    }

    handleDragEnd = () => {
        this.setState({ dragging: false });
        if (typeof this.props.onDragEnd === 'function') {
            this.props.onDragEnd(this.props.id);
        }
    }

    handleKeyDown = (e) => {
        if (this.props.renaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openApp();
            return;
        }
        if (e.key === 'F2' && typeof this.props.onRequestRename === 'function') {
            e.preventDefault();
            this.props.onRequestRename(this.props.id);
        }
    }

    openApp = () => {
        if (this.props.disabled || this.props.renaming) return;
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

    handleRenameKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            if (typeof this.props.onRenameCancel === 'function') {
                this.props.onRenameCancel();
            }
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (typeof this.props.onRenameSubmit === 'function') {
                this.props.onRenameSubmit();
            }
        }
    }

    renderName = () => {
        if (!this.props.renaming) {
            return (
                <span className="text-center leading-tight line-clamp-2">
                    {this.props.displayName || this.props.name}
                </span>
            );
        }

        return (
            <form
                className="w-full mt-1"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (typeof this.props.onRenameSubmit === 'function') {
                        this.props.onRenameSubmit();
                    }
                }}
            >
                <input
                    type="text"
                    autoFocus
                    value={this.props.renameValue}
                    onChange={(e) => this.props.onRenameChange?.(e.target.value)}
                    onBlur={() => this.props.onRenameSubmit?.()}
                    onKeyDown={this.handleRenameKeyDown}
                    className="w-full rounded bg-black bg-opacity-40 text-white text-xs px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                    spellCheck={false}
                />
            </form>
        );
    }

    render() {
        const isDisabled = this.props.disabled;
        const isSelected = this.props.selected;
        const className = [
            this.state.launching ? 'app-icon-launch' : '',
            this.state.dragging ? 'opacity-70' : '',
            'p-1 m-px z-10 rounded select-none w-24 h-24 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition hover:bg-opacity-20 focus:border-yellow-700 focus:border-opacity-100 border outline-none',
            isSelected ? 'bg-white bg-opacity-20 border border-blue-400 focus:bg-white focus:bg-opacity-30' : 'bg-white bg-opacity-0 border border-transparent hover:bg-white focus:bg-white focus:bg-opacity-30'
        ].filter(Boolean).join(' ');

        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={isDisabled}
                data-context="app"
                data-app-id={this.props.id}
                draggable={!this.props.renaming}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={className}
                id={"app-" + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={this.handleKeyDown}
                tabIndex={isDisabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={(event) => {
                    this.handlePrefetch();
                    this.props.onSelect?.(this.props.id, event);
                }}
                onClick={(event) => this.props.onSelect?.(this.props.id, event)}
                style={this.props.style}
            >
                <Image
                    width={40}
                    height={40}
                    className="mb-1 w-10"
                    src={this.props.icon.replace('./', '/')}
                    alt={"Kali " + this.props.name}
                    sizes="40px"
                />
                {this.renderName()}
            </div>
        )
    }
}

export default UbuntuApp
