import React, { Component } from 'react'
import Image from 'next/image'

export class UbuntuApp extends Component {
    constructor() {
        super();
        this.state = { launching: false, dragging: false, prefetched: false };
        this.renameInputRef = React.createRef();
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

    componentDidUpdate(prevProps) {
        if (!prevProps.isRenaming && this.props.isRenaming && this.renameInputRef.current) {
            this.renameInputRef.current.focus();
            this.renameInputRef.current.select();
        }
    }

    render() {
        const isRenaming = !!this.props.isRenaming;
        const errorId = isRenaming ? `rename-error-${this.props.id}` : undefined;
        return (
            <div
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                data-context="app"
                data-app-id={this.props.id}
                draggable={!isRenaming}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                className={(this.state.launching ? " app-icon-launch " : "") + (this.state.dragging ? " opacity-70 " : "") +
                    " p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active "}
                id={"app-" + this.props.id}
                onDoubleClick={isRenaming ? undefined : this.openApp}
                onKeyDown={(e) => {
                    if (isRenaming) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.openApp();
                    } else if (e.key === 'F2') {
                        e.preventDefault();
                        this.props.onStartRename && this.props.onStartRename();
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
                    alt={"Kali " + this.props.name}
                    sizes="40px"
                />
                {isRenaming ? (
                    <div className="mt-1 w-full">
                        <div className="flex items-center justify-center w-full rounded bg-black bg-opacity-70 px-1 py-0.5">
                            <input
                                ref={this.renameInputRef}
                                type="text"
                                value={typeof this.props.renameValue === 'string' ? this.props.renameValue : ''}
                                onChange={(e) => this.props.onRenameChange && this.props.onRenameChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        this.props.onRenameCommit && this.props.onRenameCommit();
                                    } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        this.props.onRenameCancel && this.props.onRenameCancel();
                                    }
                                }}
                                onBlur={() => this.props.onRenameCommit && this.props.onRenameCommit()}
                                aria-label={`Rename ${this.props.name}`}
                                aria-invalid={this.props.renameError ? 'true' : 'false'}
                                aria-describedby={this.props.renameError ? errorId : undefined}
                                spellCheck={false}
                                autoComplete="off"
                                className="w-full bg-transparent text-white outline-none"
                                data-rename-input={this.props.id}
                            />
                            {this.props.renameExtension ? (
                                <span className="ml-1 select-none" aria-hidden="true">{this.props.renameExtension}</span>
                            ) : null}
                        </div>
                        {this.props.renameError ? (
                            <p id={errorId} className="mt-1 text-[0.65rem] leading-tight text-red-300">
                                {this.props.renameError}
                            </p>
                        ) : null}
                    </div>
                ) : (
                    this.props.displayName || this.props.name
                )}

            </div>
        )
    }
}

export default UbuntuApp
