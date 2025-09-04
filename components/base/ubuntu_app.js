import React, { Component } from 'react';
import Image from 'next/image';

export class UbuntuApp extends Component {
    constructor(props) {
        super(props);
        this.state = {
            launching: false,
            dragging: false,
            prefetched: false,
            x: 0,
            y: 0,
            initialized: false,
        };
        this.ref = React.createRef();
    }

    componentDidMount() {
        if (this.props.draggable) {
            let { initialX, initialY } = this.props;
            if (typeof initialX !== 'number' || typeof initialY !== 'number') {
                const el = this.ref.current;
                if (el && el.offsetParent) {
                    const parentRect = el.offsetParent.getBoundingClientRect();
                    const rect = el.getBoundingClientRect();
                    const snap = (v) => Math.round(v / 16) * 16;
                    initialX = snap(rect.left - parentRect.left);
                    initialY = snap(rect.top - parentRect.top);
                    if (typeof this.props.onPositionChange === 'function') {
                        this.props.onPositionChange(this.props.name, initialX, initialY);
                    }
                } else {
                    initialX = 0;
                    initialY = 0;
                }
            }
            this.setState({ x: initialX, y: initialY, initialized: true });
        }
    }

    componentWillUnmount() {
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
    }

    openApp = () => {
        if (this.props.disabled) return;
        this.setState({ launching: true }, () => {
            setTimeout(() => this.setState({ launching: false }), 300);
        });
        this.props.openApp(this.props.id);
    };

    handlePrefetch = () => {
        if (!this.state.prefetched && typeof this.props.prefetch === 'function') {
            this.props.prefetch();
            this.setState({ prefetched: true });
        }
    };

    handlePointerDown = (e) => {
        if (this.props.disabled) return;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.origX = this.state.x;
        this.origY = this.state.y;
        this.setState({ dragging: true });
        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
    };

    handlePointerMove = (e) => {
        if (!this.state.dragging) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        this.setState({ x: this.origX + dx, y: this.origY + dy });
    };

    handlePointerUp = () => {
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        const snap = (v) => Math.round(v / 16) * 16;
        const x = snap(this.state.x);
        const y = snap(this.state.y);
        this.setState({ dragging: false, x, y });
        if (typeof this.props.onPositionChange === 'function') {
            this.props.onPositionChange(this.props.name, x, y);
        }
    };

    render() {
        const style = this.props.draggable && this.state.initialized
            ? { position: 'absolute', left: this.state.x, top: this.state.y }
            : undefined;
        return (
            <div
                ref={this.ref}
                role="button"
                aria-label={this.props.name}
                aria-disabled={this.props.disabled}
                data-context="app"
                data-app-id={this.props.id}
                onPointerDown={this.props.draggable ? this.handlePointerDown : undefined}
                className={
                    (this.state.launching ? ' app-icon-launch ' : '') +
                    (this.props.draggable && this.state.dragging ? ' opacity-70 ' : '') +
                    ' p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active '
                }
                id={'app-' + this.props.id}
                onDoubleClick={this.openApp}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.openApp();
                    }
                }}
                tabIndex={this.props.disabled ? -1 : 0}
                onMouseEnter={this.handlePrefetch}
                onFocus={this.handlePrefetch}
                style={style}
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
        );
    }
}

export default UbuntuApp;

