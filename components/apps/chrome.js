import React, { Component, createRef } from 'react';
import Image from 'next/image';

export class Chrome extends Component {
    constructor() {
        super();
        this.home_url = 'https://www.google.com/webhp?igu=1';
        this.thumbRefs = [];
        this.state = {
            url: this.home_url,
            display_url: this.home_url,
            tabs: [{ url: this.home_url }],
            activeIndex: 0,
            showGrid: false,
        }
    }

    componentDidMount() {
        // Previously the component attempted to restore the last visited URL,
        // but many sites restrict being loaded inside an iframe which resulted
        // in error pages on reload. Default to the home page instead.
        // The "igu=1" parameter allows Google Search to load inside an iframe.
        this.setState({ url: this.home_url, display_url: this.home_url }, this.refreshChrome);
    }

    storeVisitedUrl = (url, display_url) => {
        localStorage.setItem("chrome-url", url);
        localStorage.setItem("chrome-display-url", display_url);
    }

    refreshChrome = () => {
        const screen = document.getElementById("chrome-screen");
        if (screen) screen.src += '';
    }

    goToHome = () => {
        this.setState({ url: this.home_url, display_url: this.home_url, activeIndex: 0 });
        this.refreshChrome();
    }

    checkKey = (e) => {
        if (e.key === "Enter") {
            let url = e.target.value.trim();
            if (url.length === 0) return;

            if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) {
                url = "https://" + url;
            }

            const display_url = encodeURI(url);
            this.setState((prev) => {
                const tabs = [...prev.tabs];
                tabs[prev.activeIndex] = { url: display_url };
                return { url: display_url, display_url, tabs };
            }, () => {
                this.storeVisitedUrl(display_url, display_url);
                const bar = document.getElementById("chrome-url-bar");
                if (bar) bar.blur();
            });
        }
    }

    handleDisplayUrl = (e) => {
        this.setState({ display_url: e.target.value });
    }

    openGrid = () => {
        this.setState({ showGrid: true });
    }

    announceTab = (index) => {
        if (this.liveRegion) {
            this.liveRegion.textContent = `Tab ${index + 1} activated`;
        }
    }

    selectTab = (index) => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const activate = () => {
            this.setState({ activeIndex: index, url: this.state.tabs[index].url, showGrid: false }, () => this.announceTab(index));
        }
        if (prefersReduced) {
            activate();
            return;
        }
        const thumb = this.thumbRefs[index]?.current;
        if (!thumb) return activate();
        const rect = thumb.getBoundingClientRect();
        const overlay = thumb.cloneNode(true);
        overlay.style.position = 'fixed';
        overlay.style.top = `${rect.top}px`;
        overlay.style.left = `${rect.left}px`;
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.transformOrigin = 'top left';
        overlay.style.zIndex = 1000;
        overlay.style.pointerEvents = 'none';
        document.body.appendChild(overlay);
        const scaleX = window.innerWidth / rect.width;
        const scaleY = (window.innerHeight - 40) / rect.height; // account for url bar
        requestAnimationFrame(() => {
            overlay.style.transition = 'transform 300ms ease-out';
            overlay.style.transform = `scale(${scaleX}, ${scaleY}) translate(${-rect.left}px, ${-(rect.top - 40)}px)`;
        });
        setTimeout(() => {
            document.body.removeChild(overlay);
            activate();
        }, 300);
    }

    renderGrid = () => {
        return (
            <div id="chrome-grid" className="absolute inset-0 bg-gray-900 bg-opacity-90 text-white grid grid-cols-2 gap-4 p-4 overflow-auto" role="dialog" aria-label="Tab selection">
                {this.state.tabs.map((tab, idx) => {
                    if (!this.thumbRefs[idx]) this.thumbRefs[idx] = createRef();
                    return (
                        <button key={idx} ref={this.thumbRefs[idx]} onClick={() => this.selectTab(idx)} className="relative  border border-white" aria-label={`Open tab ${idx + 1}`}>
                            <iframe
                                src={tab.url}
                                title={`Tab ${idx + 1}`}
                                className="w-full h-32 pointer-events-none bg-white"
                                sandbox="allow-same-origin allow-scripts"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture"
                                referrerPolicy="no-referrer"
                            />
                        </button>
                    );
                })}
            </div>
        );
    }

    displayUrlBar = () => {
        return (
            <div className="w-full pt-0.5 pb-1 flex justify-start items-center text-white text-sm border-b border-gray-900">
                <div onClick={this.refreshChrome} className=" ml-2 mr-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10">
                    <Image
                        className="w-5"
                        src="/themes/Yaru/status/chrome_refresh.svg"
                        alt="Ubuntu Chrome Refresh"
                        width={20}
                        height={20}
                        sizes="20px"
                    />
                </div>
                <div onClick={this.goToHome} className=" mr-2 ml-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10">
                    <Image
                        className="w-5"
                        src="/themes/Yaru/status/chrome_home.svg"
                        alt="Ubuntu Chrome Home"
                        width={20}
                        height={20}
                        sizes="20px"
                    />
                </div>
                <input onKeyDown={this.checkKey} onChange={this.handleDisplayUrl} value={this.state.display_url} id="chrome-url-bar" className=" bg-ub-grey rounded-full pl-3 py-0.5 mr-3 w-5/6 text-gray-300 focus:text-white" type="url" spellCheck={false} autoComplete="off" />
                <button onClick={this.openGrid} className="mr-2 px-2 py-0.5 bg-gray-800 text-white rounded  focus:ring" aria-label="Show all tabs">Tabs</button>
            </div>
        );
    }

    render() {
        return (
            <div className="h-full w-full flex flex-col bg-ub-cool-grey relative">
                {this.displayUrlBar()}
                <div className="flex-grow relative">
                    <iframe
                        src={this.state.url}
                        className="w-full h-full"
                        id="chrome-screen"
                        frameBorder="0"
                        title="Ubuntu Chrome Url"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
                        referrerPolicy="no-referrer"
                        allowFullScreen
                    ></iframe>
                    {this.state.showGrid && this.renderGrid()}
                    <div aria-live="polite" ref={(el) => (this.liveRegion = el)} className="sr-only"></div>
                </div>
            </div>
        )
    }
}

export default Chrome

export const displayChrome = () => {
    return <Chrome> </Chrome>;
}
