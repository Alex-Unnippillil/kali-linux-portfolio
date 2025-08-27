import React, { Component } from 'react';
import Image from 'next/image';

export class Chrome extends Component {
    constructor(props) {
        super(props);
        this.home_url = 'https://www.google.com/webhp?igu=1';
        this.windowId = props.windowId || 'chrome';
        const home = this.home_url;
        this.state = {
            url: home,
            display_url: home,
            bookmarks: [],
            showBookmarks: false,
        };
    }

    componentDidMount() {
        if (typeof window === 'undefined') return;

        const storedUrl = window.localStorage.getItem(`chrome-url-${this.windowId}`);
        const storedDisplay = window.localStorage.getItem(`chrome-display-url-${this.windowId}`);
        const url = storedUrl || this.home_url;
        const display_url = storedDisplay || this.home_url;
        const bookmarks = this.loadBookmarks();

        this.setState({ url, display_url, bookmarks }, this.refreshChrome);

        window.addEventListener('popstate', this.handlePopState);
    }

    componentWillUnmount() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('popstate', this.handlePopState);
        }
    }

    loadBookmarks = () => {
        if (typeof window === 'undefined') return [];
        try {
            const stored = window.localStorage.getItem('chrome-bookmarks');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    saveBookmarks = (bookmarks) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('chrome-bookmarks', JSON.stringify(bookmarks));
    }

    handlePopState = (e) => {
        const state = e.state;
        if (state && state.windowId === this.windowId && state.url) {
            this.setState({ url: state.url, display_url: state.url }, this.refreshChrome);
        }
    }

    storeVisitedUrl = (url, display_url) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(`chrome-url-${this.windowId}`, url);
        window.localStorage.setItem(`chrome-display-url-${this.windowId}`, display_url);
    }

    pushHistory = (url) => {
        if (typeof window === 'undefined') return;
        const hash = `${this.windowId}=${encodeURIComponent(url)}`;
        window.history.pushState({ windowId: this.windowId, url }, '', `#${hash}`);
    }

    refreshChrome = () => {
        const iframe = document.getElementById('chrome-screen');
        if (iframe) iframe.src = this.state.url;
    }

    navigate = (url) => {
        const display_url = encodeURI(url);
        this.setState({ url: display_url, display_url }, () => {
            this.storeVisitedUrl(display_url, display_url);
            this.pushHistory(display_url);
            this.refreshChrome();
        });
    }

    goToHome = () => {
        this.navigate(this.home_url);
    }

    checkKey = (e) => {
        if (e.key === 'Enter') {
            let url = e.target.value.trim();
            if (url.length === 0) return;

            if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
                url = 'https://' + url;
            }

            this.navigate(url);
            const bar = document.getElementById('chrome-url-bar');
            if (bar) bar.blur();
        }
    }

    handleDisplayUrl = (e) => {
        this.setState({ display_url: e.target.value });
    }

    toggleBookmarks = () => {
        this.setState({ showBookmarks: !this.state.showBookmarks });
    }

    addBookmark = () => {
        const name = window.prompt('Bookmark name', this.state.display_url);
        if (!name) return;
        const newBookmark = { name, url: this.state.display_url };
        const bookmarks = [...this.state.bookmarks, newBookmark];
        this.setState({ bookmarks }, () => this.saveBookmarks(bookmarks));
    }

    deleteBookmark = (idx) => {
        const bookmarks = this.state.bookmarks.filter((_, i) => i !== idx);
        this.setState({ bookmarks }, () => this.saveBookmarks(bookmarks));
    }

    editBookmark = (idx) => {
        const current = this.state.bookmarks[idx];
        const name = window.prompt('Edit bookmark name', current.name);
        if (!name) return;
        const bookmarks = this.state.bookmarks.slice();
        bookmarks[idx] = { ...current, name };
        this.setState({ bookmarks }, () => this.saveBookmarks(bookmarks));
    }

    openBookmarkInWindow = (url) => {
        this.navigate(url);
    }

    openBookmarkInTab = (url) => {
        if (typeof window !== 'undefined') window.open(url, '_blank');
    }

    renderBookmarksMenu = () => {
        if (!this.state.showBookmarks) return null;
        return (
            <div className="absolute top-6 left-0 bg-ub-grey text-white text-xs w-56 rounded shadow-lg z-50">
                {this.state.bookmarks.length ? (
                    <ul>
                        {this.state.bookmarks.map((bm, idx) => (
                            <li key={idx} className="flex justify-between items-center px-2 py-1 hover:bg-ub-cool-grey">
                                <span className="cursor-pointer" onClick={() => this.openBookmarkInWindow(bm.url)}>{bm.name}</span>
                                <div className="flex space-x-1">
                                    <button onClick={() => this.openBookmarkInTab(bm.url)} title="Open in new tab">↗</button>
                                    <button onClick={() => this.editBookmark(idx)} title="Edit">✎</button>
                                    <button onClick={() => this.deleteBookmark(idx)} title="Delete">✕</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <div className="px-2 py-1">No bookmarks</div>}
                <div className="border-t border-gray-700">
                    <button className="w-full text-left px-2 py-1 hover:bg-ub-cool-grey" onClick={this.addBookmark}>Add Bookmark</button>
                </div>
            </div>
        );
    }

    displayUrlBar = () => {
        return (
            <div className="w-full pt-0.5 pb-1 flex justify-start items-center text-white text-sm border-b border-gray-900 relative">
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
                <input onKeyDown={this.checkKey} onChange={this.handleDisplayUrl} value={this.state.display_url} id="chrome-url-bar" className="outline-none bg-ub-grey rounded-full pl-3 py-0.5 mr-3 w-5/6 text-gray-300 focus:text-white" type="url" spellCheck={false} autoComplete="off" />
                <div className="mr-2 ml-1 relative">
                    <div onClick={this.toggleBookmarks} className="flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10 cursor-pointer px-1">★</div>
                    {this.renderBookmarksMenu()}
                </div>
            </div>
        );
    }

    render() {
        return (
            <div className="h-full w-full flex flex-col bg-ub-cool-grey">
                {this.displayUrlBar()}
                <iframe src={this.state.url} className="flex-grow" id="chrome-screen" frameBorder="0" title="Ubuntu Chrome Url"></iframe>
            </div>
        );
    }
}

export default Chrome;

export const displayChrome = (_addFolder, _openApp, windowId) => {
    return <Chrome windowId={windowId} />;
}

