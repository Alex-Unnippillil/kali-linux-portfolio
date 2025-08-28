import React, { Component } from "react";
import Image from 'next/image';

export class SideBarApp extends Component {
    constructor() {
        super();
        this.id = null;
        this.state = {
            showTitle: false,
            scaleImage: false,
            attention: false,
            badgeCount: 0,
        };
    }

    componentDidMount() {
        this.id = this.props.id;
        window.addEventListener('app-attention', this.handleAttention);
    }

    componentWillUnmount() {
        window.removeEventListener('app-attention', this.handleAttention);
    }

    handleAttention = (e) => {
        if (!e.detail) return;
        const { appId, badge = 0 } = e.detail;
        if (!window.__appBadges) window.__appBadges = {};
        window.__appBadges[appId] = badge;
        this.updateGlobalBadge();
        if (appId !== this.id) return;
        this.setState({ attention: badge > 0, badgeCount: badge });
    }

    updateGlobalBadge = () => {
        if (!('setAppBadge' in navigator)) return;
        const badges = window.__appBadges || {};
        const total = Object.values(badges).reduce((a, b) => a + b, 0);
        if (total > 0) {
            navigator.setAppBadge(total).catch(() => { });
        } else if ('clearAppBadge' in navigator) {
            navigator.clearAppBadge().catch(() => { });
        }
    }

    scaleImage = () => {
        setTimeout(() => {
            this.setState({ scaleImage: false });
        }, 1000);
        this.setState({ scaleImage: true });
    }

    openApp = () => {
        if (!this.props.isMinimized[this.id] && this.props.isClose[this.id]) {
            this.scaleImage();
        }
        this.props.openApp(this.id);
        if (window.__appBadges) {
            window.__appBadges[this.id] = 0;
        }
        this.setState({ showTitle: false, attention: false, badgeCount: 0 }, this.updateGlobalBadge);
    };

    render() {
        return (
            <button
                type="button"
                aria-label={this.props.title}
                data-context="app"
                data-app-id={this.props.id}
                onClick={this.openApp}
                onMouseEnter={() => {
                    this.setState({ showTitle: true });
                }}
                onMouseLeave={() => {
                    this.setState({ showTitle: false });
                }}
                className={(this.props.isClose[this.id] === false && this.props.isFocus[this.id] ? "bg-white bg-opacity-10 " : "") + (this.state.attention ? " animate-bounce " : "") + " w-auto p-2 outline-none relative transition hover:bg-white hover:bg-opacity-10 rounded m-1"}
                id={"sidebar-" + this.props.id}
            >
                <Image
                    width={28}
                    height={28}
                    className={(this.state.attention ? " animate-pulse " : "") + " w-7"}
                    src={this.props.icon.replace('./', '/')}
                    alt="Ubuntu App Icon"
                    sizes="28px"
                />
                <Image
                    width={28}
                    height={28}
                    className={(this.state.scaleImage ? " scale " : "") + " scalable-app-icon w-7 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"}
                    src={this.props.icon.replace('./', '/')}
                    alt=""
                    sizes="28px"
                />
                {
                    (
                        this.props.isClose[this.id] === false
                            ? <div className=" w-1 h-1 absolute left-0 top-1/2 bg-white rounded-sm"></div>
                            : null
                    )
                }
                <div
                    className={
                        (this.state.showTitle ? " visible " : " invisible ") +
                        " w-max py-0.5 px-1.5 absolute top-1.5 left-full ml-3 m-1 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md"
                    }
                >
                    {this.props.title}
                </div>
                {
                    this.state.badgeCount > 0 ? (
                        <div className="absolute -top-0 -right-0 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
                            {this.state.badgeCount}
                        </div>
                    ) : null
                }
            </button>
        );
    }
}

export default SideBarApp;
