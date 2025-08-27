import React, { Component } from 'react';
import Image from 'next/image';

export class Chrome extends Component {
    constructor() {
        super();
        this.home_url = 'https://www.google.com/webhp?igu=1';
        this.state = {
            url: this.home_url,
            display_url: this.home_url,
            loading: true,
            favicon: this.getFavicon(this.home_url),
        }
    }

    componentDidMount() {
        // Previously the component attempted to restore the last visited URL,
        // but many sites restrict being loaded inside an iframe which resulted
        // in error pages on reload. Default to the home page instead.
        // The "igu=1" parameter allows Google Search to load inside an iframe.
        this.setState(
            { url: this.home_url, display_url: this.home_url, loading: true },
            () => {
                this.updateFavicon(this.home_url);
                this.refreshChrome();
            }
        );
    }

    storeVisitedUrl = (url, display_url) => {
        localStorage.setItem("chrome-url", url);
        localStorage.setItem("chrome-display-url", display_url);
    }

    refreshChrome = () => {
        this.setState({ loading: true }, () => {
            const iframe = document.getElementById("chrome-screen");
            if (iframe) {
                iframe.src = this.state.url;
            }
        });
    }

    goToHome = () => {
        this.setState({ url: this.home_url, display_url: this.home_url, loading: true }, () => {
            this.updateFavicon(this.home_url);
            this.refreshChrome();
        });
    }

    checkKey = (e) => {
        if (e.key === "Enter") {
            let url = e.target.value.trim();
            if (url.length === 0) return;

            if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) {
                url = "https://" + url;
            }

            const display_url = encodeURI(url);
            this.setState({ url: display_url, display_url, loading: true }, () => {
                this.updateFavicon(display_url);
                this.storeVisitedUrl(display_url, display_url);
                document.getElementById("chrome-url-bar").blur();
            });
        }
    }

    handleDisplayUrl = (e) => {
        this.setState({ display_url: e.target.value });
    }

    getFavicon = (url) => {
        try {
            const { hostname } = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${hostname}`;
        } catch {
            return '';
        }
    }

    updateFavicon = (url) => {
        this.setState({ favicon: this.getFavicon(url) });
    }

    handleIframeLoad = () => {
        this.setState({ loading: false });
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
                {this.state.loading && (
                    <div className="mr-2 ml-1 flex justify-center items-center">
                        <Image
                            className="w-4 h-4 animate-spin"
                            src="/themes/Yaru/status/process-working-symbolic.svg"
                            alt="Loading"
                            width={16}
                            height={16}
                            sizes="16px"
                        />
                    </div>
                )}
                {!this.state.loading && this.state.favicon && (
                    <img className="w-4 h-4 mr-2 ml-1" src={this.state.favicon} alt="" />
                )}
                <input onKeyDown={this.checkKey} onChange={this.handleDisplayUrl} value={this.state.display_url} id="chrome-url-bar" className="outline-none bg-ub-grey rounded-full pl-3 py-0.5 mr-3 w-5/6 text-gray-300 focus:text-white" type="url" spellCheck={false} autoComplete="off" />
            </div>
        );
    }

    render() {
        return (
            <div className="h-full w-full flex flex-col bg-ub-cool-grey">
                {this.displayUrlBar()}
                <iframe src={this.state.url} className="flex-grow" id="chrome-screen" frameBorder="0" title="Ubuntu Chrome Url" onLoad={this.handleIframeLoad}></iframe>
            </div>
        )
    }
}

export default Chrome

export const displayChrome = () => {
    return <Chrome> </Chrome>;
}
