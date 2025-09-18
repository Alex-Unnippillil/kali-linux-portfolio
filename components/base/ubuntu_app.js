import React, { Component } from 'react'
import DesktopIcon from '../core/DesktopIcon'

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
        return (
            <DesktopIcon
                id={this.props.id}
                icon={this.props.icon}
                label={this.props.displayName || this.props.name}
                disabled={this.props.disabled}
                launching={this.state.launching}
                dragging={this.state.dragging}
                snapEnabled={this.props.snapEnabled}
                onActivate={this.openApp}
                onDragStart={this.handleDragStart}
                onDragEnd={this.handleDragEnd}
                onPrefetch={this.handlePrefetch}
            />
        )
    }
}

export default UbuntuApp
