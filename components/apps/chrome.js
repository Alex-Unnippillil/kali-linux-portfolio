import React, { Component } from 'react';
import Image from 'next/image';
import { sendTelemetry } from '@lib/game';

const ALLOWED_HOSTS = [
    'stackblitz.com',
    'todoist.com',
    'open.spotify.com',
    'platform.twitter.com',
    'syndication.twitter.com',
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'google.com',
    'www.google.com',
];
const ALLOWED_SUFFIXES = ['.google.com'];

function isAllowedHost(host) {
    return (
        ALLOWED_HOSTS.includes(host) ||
        ALLOWED_SUFFIXES.some((s) => host.endsWith(s))
    );
}

function isPublicIP(ip) {
    const blocks = [
        /^0\./,
        /^10\./,
        /^127\./,
        /^169\.254\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./,
        /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./,
    ];
    return !blocks.some((re) => re.test(ip));
}

async function resolvesToPublic(hostname) {
    try {
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`, {
            headers: { Accept: 'application/dns-json' },
        });
        const data = await res.json();
        if (!data.Answer) return false;
        return data.Answer.every((a) => isPublicIP(a.data));
    } catch {
        return false;
    }
}

export class Chrome extends Component {
    constructor() {
        super();
        this.home_url = 'https://www.google.com/webhp?igu=1';
        this.state = {
            url: this.home_url,
            display_url: this.home_url,
            error: null,
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
        document.getElementById("chrome-screen").src += '';
    }

    goToHome = () => {
        this.setState({ url: this.home_url, display_url: this.home_url }, () => {
            this.clearError();
            this.refreshChrome();
        });
    }

    navigate = async (input) => {
        try {
            let url = input.trim();
            if (!url) return;
            if (!/^https?:\/\//i.test(url)) {
                url = "https://" + url;
            }
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:') {
                this.setError('Only HTTPS URLs are allowed.');
                return;
            }
            if (!isAllowedHost(parsed.hostname)) {
                this.setError('Domain not allowed.');
                return;
            }
            const publicIp = await resolvesToPublic(parsed.hostname);
            if (!publicIp) {
                this.setError('Domain resolves to a private or invalid IP.');
                return;
            }
            const display_url = parsed.toString();
            this.setState({ url: display_url, display_url }, () => {
                this.storeVisitedUrl(display_url, display_url);
                document.getElementById("chrome-url-bar").blur();
                this.clearError();
            });
        } catch {
            this.setError('Invalid URL.');
        }
    }

    checkKey = (e) => {
        if (e.key === "Enter") {
            this.navigate(e.target.value);
        }
    }

    setError = (msg) => {
        this.setState({ error: msg });
        sendTelemetry({ name: 'chrome-load-error', data: { url: this.state.url, msg } });
    }

    clearError = () => {
        this.setState({ error: null });
    }

    handleIframeError = () => {
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        this.setError(offline ? 'You appear to be offline.' : 'Failed to load page.');
    }

    retry = () => {
        this.clearError();
        this.refreshChrome();
    }

    handleDisplayUrl = (e) => {
        this.setState({ display_url: e.target.value });
    }

    displayUrlBar = () => {
        return (
            <div className="w-full pt-0.5 pb-1 flex justify-start items-center text-white text-sm border-b border-gray-900">
                <div onClick={this.refreshChrome} className=" ml-2 mr-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10">
                    <Image
                        className="w-5"
                        src="/themes/Yaru/status/chrome_refresh.svg"
                        alt="Kali Browser Refresh"
                        width={20}
                        height={20}
                        sizes="20px"
                    />
                </div>
                <div onClick={this.goToHome} className=" mr-2 ml-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10">
                    <Image
                        className="w-5"
                        src="/themes/Yaru/status/chrome_home.svg"
                        alt="Kali Browser Home"
                        width={20}
                        height={20}
                        sizes="20px"
                    />
                </div>
                <input onKeyDown={this.checkKey} onChange={this.handleDisplayUrl} value={this.state.display_url} id="chrome-url-bar" className="outline-none bg-surface rounded-full pl-3 py-0.5 mr-3 w-5/6 text-gray-300 focus:text-white" type="url" spellCheck={false} autoComplete="off" />
            </div>
        );
    }

    render() {
        return (
            <div className="h-full w-full flex flex-col bg-surface">
                {this.displayUrlBar()}
                <div className="relative flex-grow">
                    <iframe
                        src={this.state.url}
                        className="w-full h-full"
                        id="chrome-screen"
                        frameBorder="0"
                        title="Kali Browser Url"
                        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
                        onError={this.handleIframeError}
                    ></iframe>
                    {this.state.error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface text-center text-white space-y-2">
                            <p>{this.state.error}</p>
                            <div className="space-x-2">
                                <button onClick={this.retry} className="px-3 py-1 bg-blue-600 rounded">Retry</button>
                                <a href={this.state.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-gray-700 rounded">Open in new tab</a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }
}

export default Chrome

export const displayChrome = () => {
    return <Chrome> </Chrome>;
}
