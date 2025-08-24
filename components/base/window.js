import React, { Component } from 'react';
import NextImage from 'next/image';
import { DndContext, useDraggable } from '@dnd-kit/core';
import Settings from '../apps/settings';
import { trackEvent, trackPageview } from '../../lib/analytics';

function DraggableContainer({ id, defaultPosition, bounds, onDrag, onStart, onStop, children, position: controlledPosition, onPositionChange }) {
    const [internalPosition, setInternalPosition] = React.useState(defaultPosition);
    const isControlled = controlledPosition !== undefined;
    const position = isControlled ? controlledPosition : internalPosition;
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
    const dx = position.x + (transform ? transform.x : 0);
    const dy = position.y + (transform ? transform.y : 0);
    const style = {
        transform: `translate3d(${dx}px, ${dy}px, 0)`
    };

    const updatePosition = (newPos) => {
        if (isControlled && onPositionChange) {
            onPositionChange(newPos);
        } else {
            setInternalPosition(newPos);
        }
    };

    const handleDragEnd = (event) => {
        const { delta } = event;
        let newX = position.x + delta.x;
        let newY = position.y + delta.y;
        if (bounds) {
            newX = Math.min(Math.max(newX, bounds.left), bounds.right);
            newY = Math.min(Math.max(newY, bounds.top), bounds.bottom);
        }
        updatePosition({ x: newX, y: newY });
        if (onStop) onStop();
    };

    const handleDragMove = (event) => {
        const { delta } = event;
        let newX = position.x + delta.x;
        let newY = position.y + delta.y;
        if (bounds) {
            newX = Math.min(Math.max(newX, bounds.left), bounds.right);
            newY = Math.min(Math.max(newY, bounds.top), bounds.bottom);
        }
        if (onDrag) onDrag(null, { x: newX, y: newY });
    };

    return (
        <DndContext onDragStart={onStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
            <div ref={setNodeRef} style={style}>
                {typeof children === 'function' ? children({ attributes, listeners }) : children}
            </div>
        </DndContext>
    );
}

export class Window extends Component {
    constructor(props) {
        super(props);
        // Use a stable id immediately so the first render has it
        this.id = props.id;
        this.startX = 60;
        this.startY = 10;
        this.state = {
            cursorType: "cursor-default",
            width: props.defaultWidth || 60,
            height: props.defaultHeight || 85,
            closed: false,
            maximized: false,
            parentSize: {
                height: 100,
                width: 100
            },
            position: { x: this.startX, y: this.startY }
        }
        this.windowRef = React.createRef();
    }

    componentDidMount() {
        this.setDefaultWindowDimenstion();

        // google analytics
        trackPageview(`/${this.id}`, "Custom Title");
        trackEvent('window_open', { id: this.id, title: this.props.title });

        // on window resize, resize boundary
        window.addEventListener('resize', this.resizeBoundries);
    }

    componentWillUnmount() {
        trackPageview('/desktop', 'Custom Title');
        window.removeEventListener('resize', this.resizeBoundries);
    }

    setDefaultWindowDimenstion = () => {
        if (this.props.defaultHeight && this.props.defaultWidth) {
            this.setState({ height: this.props.defaultHeight, width: this.props.defaultWidth }, this.resizeBoundries);
        }
        else if (window.innerWidth < 640) {
            this.setState({ height: 60, width: 85 }, this.resizeBoundries);
        }
        else {
            this.setState({ height: 85, width: 60 }, this.resizeBoundries);
        }
    }

    resizeBoundries = () => {
        this.setState({
            parentSize: {
                height: window.innerHeight //parent height
                    - (window.innerHeight * (this.state.height / 100.0))  // this window's height
                    - 28 // some padding
                ,
                width: window.innerWidth // parent width
                    - (window.innerWidth * (this.state.width / 100.0)) //this window's width
            }
        });
    }

    changeCursorToMove = () => {
        this.focusWindow();
        if (this.state.maximized) {
            this.restoreWindow();
        }
        this.setState({ cursorType: "cursor-move" })
    }

    changeCursorToDefault = () => {
        this.setState({ cursorType: "cursor-default" })
    }

    handleKeyboardMove = (dx, dy) => {
        const bounds = { left: 0, top: 0, right: this.state.parentSize.width, bottom: this.state.parentSize.height };
        this.setState(prevState => {
            let newX = prevState.position.x + dx;
            let newY = prevState.position.y + dy;
            newX = Math.min(Math.max(newX, bounds.left), bounds.right);
            newY = Math.min(Math.max(newY, bounds.top), bounds.bottom);
            return { position: { x: newX, y: newY } };
        }, this.checkOverlap);
    }

    handleKeyDown = (e) => {
        if (e.altKey) {
            switch (e.key) {
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.closeWindow();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.focusWindow();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.handleKeyboardMove(0, -10);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.handleKeyboardMove(0, 10);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.handleKeyboardMove(-10, 0);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.handleKeyboardMove(10, 0);
                    break;
                default:
                    break;
            }
        }
    }

    handleVerticleResize = () => {
        if (this.props.resizable === false) return;
        this.setState({ height: this.state.height + 0.1 }, this.resizeBoundries);
    }

    handleHorizontalResize = () => {
        if (this.props.resizable === false) return;
        this.setState({ width: this.state.width + 0.1 }, this.resizeBoundries);
    }

    setWinowsPosition = () => {
        var r = document.querySelector("#" + this.id);
        var rect = r.getBoundingClientRect();
        r.style.setProperty('--window-transform-x', rect.x.toFixed(1).toString() + "px");
        r.style.setProperty('--window-transform-y', (rect.y.toFixed(1) - 32).toString() + "px");
    }

    checkOverlap = () => {
        var r = document.querySelector("#" + this.id);
        var rect = r.getBoundingClientRect();
        if (rect.x.toFixed(1) < 50) { // if this window overlapps with SideBar
            this.props.hideSideBar(this.id, true);
        }
        else {
            this.props.hideSideBar(this.id, false);
        }
    }

    focusWindow = () => {
        this.props.focus(this.id);
        if (this.windowRef.current) {
            this.windowRef.current.focus();
        }
    }

    minimizeWindow = () => {
        let posx = -310;
        if (this.state.maximized) {
            posx = -510;
        }
        this.setWinowsPosition();
        // get corrosponding sidebar app's position
        var r = document.querySelector("#sidebar-" + this.id);
        var sidebBarApp = r.getBoundingClientRect();

        r = document.querySelector("#" + this.id);
        // translate window to that position
        r.style.transform = `translate(${posx}px,${sidebBarApp.y.toFixed(1) - 240}px) scale(0.2)`;
        this.props.hasMinimised(this.id);
    }

    restoreWindow = () => {
        var r = document.querySelector("#" + this.id);
        this.setDefaultWindowDimenstion();
        // get previous position
        let posx = r.style.getPropertyValue("--window-transform-x");
        let posy = r.style.getPropertyValue("--window-transform-y");

        r.style.transform = `translate(${posx},${posy})`;
        setTimeout(() => {
            this.setState({ maximized: false });
            this.checkOverlap();
        }, 300);
    }

    maximizeWindow = () => {
        if (this.props.allowMaximize === false) return;
        if (this.state.maximized) {
            this.restoreWindow();
        }
        else {
            this.focusWindow();
            var r = document.querySelector("#" + this.id);
            this.setWinowsPosition();
            // translate window to maximize position
            r.style.transform = `translate(-1pt,-2pt)`;
            this.setState({ maximized: true, height: 96.3, width: 100.2 });
            this.props.hideSideBar(this.id, true);
        }
    }

    closeWindow = () => {
        trackEvent('window_close', { id: this.id, title: this.props.title });
        this.setWinowsPosition();
        this.setState({ closed: true }, () => {
            this.props.hideSideBar(this.id, false);
            setTimeout(() => {
                this.props.closed(this.id)
            }, 300) // after 300ms this window will be unmounted from parent (Desktop)
        });
    }

    render() {
        return (
            <DraggableContainer
                id={this.id}
                defaultPosition={{ x: this.startX, y: this.startY }}
                position={this.state.position}
                onPositionChange={(pos) => this.setState({ position: pos })}
                bounds={{ left: 0, top: 0, right: this.state.parentSize.width, bottom: this.state.parentSize.height }}
                onStart={this.changeCursorToMove}
                onStop={this.changeCursorToDefault}
                onDrag={this.checkOverlap}
            >
                {({ attributes, listeners }) => (
                    <div
                        ref={this.windowRef}
                        tabIndex={0}
                        onKeyDown={this.handleKeyDown}
                        style={{ width: `${this.state.width}%`, height: `${this.state.height}%` }}
                        className={
                            "pointer-events-auto " +
                            this.state.cursorType +
                            " " +
                            (this.state.closed ? " closed-window " : "") +
                            (this.state.maximized ? " duration-300 rounded-none" : " rounded-lg rounded-b-none") +
                            (this.props.minimized ? " opacity-0 invisible duration-200 " : "") +
                            (this.props.isFocused ? " z-30 " : " z-20 notFocused") +
                            " opened-window overflow-hidden min-w-1/4 min-h-1/4 main-window absolute window-shadow border-black border-opacity-40 border border-t-0 flex flex-col"
                        }
                        id={this.id}
                        role="dialog"
                        aria-label={this.props.title}
                        data-testid={`window-${this.id}`}
                    >
                        {this.props.resizable !== false && <WindowYBorder resize={this.handleHorizontalResize} />}
                        {this.props.resizable !== false && <WindowXBorder resize={this.handleVerticleResize} />}
                        <WindowTopBar title={this.props.title} handleProps={{ ...attributes, ...listeners }} />
                        <WindowEditButtons minimize={this.minimizeWindow} maximize={this.maximizeWindow} isMaximised={this.state.maximized} close={this.closeWindow} id={this.id} allowMaximize={this.props.allowMaximize !== false} />
                        {(this.id === "settings"
                            ? <Settings changeBackgroundImage={this.props.changeBackgroundImage} currBgImgName={this.props.bg_image_name} />
                            : <WindowMainScreen screen={this.props.screen} title={this.props.title}
                                addFolder={this.props.id === "terminal" ? this.props.addFolder : null}
                                openApp={this.props.openApp} />)}
                    </div>
                )}
            </DraggableContainer >
        )
    }
}

export default Window

// Window's title bar
export function WindowTopBar(props) {
    return (
        <div className={" relative bg-window-title border-t-2 border-white border-opacity-5 py-1.5 px-3 text-white w-full select-none rounded-b-none"} {...props.handleProps}>
            <div className="flex justify-center text-sm font-bold">{props.title}</div>
        </div>
    )
}

// Window's Borders
export class WindowYBorder extends Component {
    componentDidMount() {
        // Use the browser's Image constructor rather than the imported Next.js
        // Image component to avoid runtime errors when running in tests.

        this.trpImg = new window.Image(0, 0);
        this.trpImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        this.trpImg.style.opacity = 0;
    }
    render() {
        return (
            <div className=" window-y-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" onDragStart={(e) => { e.dataTransfer.setDragImage(this.trpImg, 0, 0) }} onDrag={this.props.resize}>
            </div>
        )
    }
}

export class WindowXBorder extends Component {
    componentDidMount() {
        // Use the global Image constructor instead of Next.js Image component

        this.trpImg = new window.Image(0, 0);
        this.trpImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        this.trpImg.style.opacity = 0;
    }
    render() {
        return (
            <div className=" window-x-border border-transparent border-1 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" onDragStart={(e) => { e.dataTransfer.setDragImage(this.trpImg, 0, 0) }} onDrag={this.props.resize}>
            </div>
        )
    }
}

// Window's Edit Buttons
export function WindowEditButtons(props) {
    return (
        <div className="absolute select-none right-0 top-0 mt-1 mr-1 flex justify-center items-center">
            <button
                type="button"
                aria-label="Minimize window"
                className="mx-1.5 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center mt-1 h-5 w-5 items-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                onClick={props.minimize}
            >
                <NextImage
                    src="/themes/Yaru/window/window-minimize-symbolic.svg"
                    alt="Ubuntu window minimize"
                    className="h-5 w-5 inline"
                    width={20}
                    height={20}
                    sizes="20px"
                />
            </button>
            {props.allowMaximize && (
                props.isMaximised ? (
                    <button
                        type="button"
                        aria-label="Restore window"
                        className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center mt-1 h-5 w-5 items-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        onClick={props.maximize}
                    >
                        <NextImage
                            src="/themes/Yaru/window/window-restore-symbolic.svg"
                            alt="Ubuntu window restore"
                            className="h-5 w-5 inline"
                            width={20}
                            height={20}
                            sizes="20px"
                        />
                    </button>
                ) : (
                    <button
                        type="button"
                        aria-label="Maximize window"
                        className="mx-2 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center mt-1 h-5 w-5 items-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        onClick={props.maximize}
                    >
                        <NextImage
                            src="/themes/Yaru/window/window-maximize-symbolic.svg"
                            alt="Ubuntu window maximize"
                            className="h-5 w-5 inline"
                            width={20}
                            height={20}
                            sizes="20px"
                        />
                    </button>
                )
            )}
            <button
                type="button"
                id={`close-${props.id}`}
                aria-label="Close window"
                className="mx-1.5 cursor-default bg-panel bg-opacity-90 hover:bg-opacity-100 rounded-full flex justify-center mt-1 h-5 w-5 items-center focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                onClick={props.close}
            >
                <NextImage
                    src="/themes/Yaru/window/window-close-symbolic.svg"
                    alt="Ubuntu window close"
                    className="h-5 w-5 inline"
                    width={20}
                    height={20}
                    sizes="20px"
                />
            </button>
        </div>
    )
}

// Window's Main Screen
export class WindowMainScreen extends Component {
    constructor() {
        super();
        this.state = {
            setDarkBg: false,
        }
    }
    componentDidMount() {
        setTimeout(() => {
            this.setState({ setDarkBg: true });
        }, 3000);
    }
    render() {
        return (
            <div className={"w-full flex-grow z-20 max-h-full overflow-y-auto windowMainScreen" + (this.state.setDarkBg ? " bg-brand-dark " : " bg-panel")}>
                {this.props.screen(this.props.addFolder, this.props.openApp)}
            </div>
        )
    }
}
