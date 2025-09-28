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
        const isRenaming = !!this.props.isRenaming;
        const displayName = this.props.displayName || this.props.name;
        const handleDoubleClick = isRenaming ? () => { } : this.openApp;
        const draggable = !isRenaming;

        return (
            <div
                role="button"
                aria-label={displayName}
                aria-disabled={this.props.disabled}
                data-context="app"
                data-app-id={this.props.id}
                draggable={draggable}
                onDragStart={draggable ? this.handleDragStart : undefined}
                onDragEnd={draggable ? this.handleDragEnd : undefined}
                className={(this.state.launching ? " app-icon-launch " : "") + (this.state.dragging ? " opacity-70 " : "") +
                    " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-24 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={handleDoubleClick}
                onKeyDown={(e) => {
                    if (isRenaming) {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            this.props.onRenameCancel && this.props.onRenameCancel();
                        }
                        return;
                    }
                    if ((e.key === 'Enter' || e.key === ' ') && !this.props.disabled) {
                        e.preventDefault();
                        this.openApp();
                    }
                }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
            >
                <Image
                    width={40}
                    height={40}
                    className="mb-1 w-10"
                    src={this.props.icon.replace('./', '/')}
                    alt={"Kali " + displayName}
                    sizes="40px"
                />
                {isRenaming ? (
                    <form
                        className="w-full"
                        onSubmit={(e) => {
                            e.preventDefault();
                            this.props.onRenameSubmit && this.props.onRenameSubmit();
                        }}
                    >
                        <input
                            autoFocus
                            aria-label={`Rename ${displayName}`}
                            value={this.props.renameValue}
                            onChange={(e) => this.props.onRenameChange && this.props.onRenameChange(e.target.value)}
                            onBlur={() => this.props.onRenameSubmit && this.props.onRenameSubmit()}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    e.preventDefault();
                                    this.props.onRenameCancel && this.props.onRenameCancel();
                                }
                            }}
                            spellCheck={false}
                            className="w-full rounded bg-white bg-opacity-80 px-1 py-0.5 text-xs font-medium text-ub-cool-grey focus:outline-none focus:ring-2 focus:ring-ub-cream"
                        />
                    </form>
                ) : (
                    <span className="w-full px-1 text-xs font-normal text-white">
                        <span className="block truncate" title={displayName}>{displayName}</span>
                    </span>
                )}

            </div>
        )
    }
}

export default UbuntuApp
