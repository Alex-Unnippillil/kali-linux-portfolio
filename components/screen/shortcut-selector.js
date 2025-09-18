import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

class ShortcutSelector extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            activeIndex: -1,
            liveMessage: '',
        };
        this.searchRef = React.createRef();
        this.skipFocusOnce = false;
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        const message = this.getResultsMessage(combined.length);
        const activeIndex = combined.length ? 0 : -1;
        this.skipFocusOnce = true;
        this.setState(
            {
                apps: combined,
                unfilteredApps: combined,
                activeIndex,
                liveMessage: message,
            },
            () => {
                this.focusSearch();
            }
        );
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.activeIndex !== this.state.activeIndex) {
            if (this.skipFocusOnce) {
                this.skipFocusOnce = false;
            } else if (this.state.activeIndex !== -1) {
                this.focusResult(this.state.activeIndex);
            }
        } else if (this.skipFocusOnce) {
            this.skipFocusOnce = false;
        }
    }

    focusSearch = () => {
        if (this.searchRef && typeof this.searchRef.current?.focus === 'function') {
            this.searchRef.current.focus();
        }
    }

    getResultsMessage = (count) => {
        if (count === 0) {
            return 'No results found.';
        }
        return `${count} result${count === 1 ? '' : 's'} available.`;
    }

    focusResult = (index) => {
        const app = this.state.apps[index];
        if (!app) return;
        const node = typeof document !== 'undefined' ? document.getElementById(`app-${app.id}`) : null;
        if (node && typeof node.focus === 'function') {
            node.focus();
        }
    }

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredApps } = this.state;
        const apps =
            value === '' || value === null
                ? unfilteredApps
                : unfilteredApps.filter((app) =>
                      app.title.toLowerCase().includes(value.toLowerCase())
                  );
        const activeIndex = apps.length ? 0 : -1;
        this.skipFocusOnce = true;
        this.setState({ query: value, apps, activeIndex, liveMessage: this.getResultsMessage(apps.length) });
    };

    handleInputKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.state.apps.length) {
                if (this.state.activeIndex === 0) {
                    this.focusResult(0);
                } else {
                    this.setState({ activeIndex: 0 });
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.state.apps.length) {
                const last = this.state.apps.length - 1;
                if (this.state.activeIndex === last) {
                    this.focusResult(last);
                } else {
                    this.setState({ activeIndex: last });
                }
            }
        } else if (e.key === 'Escape') {
            if (typeof this.props.onClose === 'function') {
                e.preventDefault();
                this.props.onClose();
            }
        }
    }

    handleResultsKeyDown = (e) => {
        if (['ArrowDown', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            this.moveActive(1);
        } else if (['ArrowUp', 'ArrowLeft'].includes(e.key)) {
            e.preventDefault();
            this.moveActive(-1);
        } else if (e.key === 'Home') {
            e.preventDefault();
            if (this.state.apps.length) {
                if (this.state.activeIndex === 0) {
                    this.focusResult(0);
                } else {
                    this.setState({ activeIndex: 0 });
                }
            }
        } else if (e.key === 'End') {
            e.preventDefault();
            if (this.state.apps.length) {
                const last = this.state.apps.length - 1;
                if (this.state.activeIndex === last) {
                    this.focusResult(last);
                } else {
                    this.setState({ activeIndex: last });
                }
            }
        } else if (e.key === 'Escape') {
            if (typeof this.props.onClose === 'function') {
                e.preventDefault();
                this.props.onClose();
            }
        }
    }

    moveActive = (direction) => {
        this.setState((state) => {
            if (!state.apps.length) return null;
            const count = state.apps.length;
            const current = state.activeIndex;
            let next;
            if (current === -1) {
                next = direction > 0 ? 0 : count - 1;
            } else {
                next = (current + direction + count) % count;
            }
            return { activeIndex: next };
        });
    }

    selectApp = (id) => {
        if (typeof this.props.onSelect === 'function') {
            this.props.onSelect(id);
        }
    };

    renderApps = () => {
        const apps = this.state.apps || [];
        const activeIndex = this.state.activeIndex;
        return apps.map((app, index) => (
            <UbuntuApp
                key={app.id}
                name={app.title}
                id={app.id}
                icon={app.icon}
                openApp={() => this.selectApp(app.id)}
                disabled={app.disabled}
                prefetch={app.screen?.prefetch}
                tabIndex={index === activeIndex ? 0 : -1}
            />
        ));
    };

    render() {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <input
                    className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Search"
                    aria-label="Search applications"
                    value={this.state.query}
                    onChange={this.handleChange}
                    onKeyDown={this.handleInputKeyDown}
                    ref={this.searchRef}
                />
                <div className="sr-only" aria-live="polite" role="status" aria-atomic="true">
                    {this.state.liveMessage}
                </div>
                <div
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center"
                    aria-label="Search results"
                    onKeyDown={this.handleResultsKeyDown}
                >
                    {this.renderApps()}
                </div>
                <button
                    className="mb-8 px-4 py-2 rounded bg-black bg-opacity-20 text-white"
                    onClick={this.props.onClose}
                >
                    Cancel
                </button>
            </div>
        );
    }
}

export default ShortcutSelector;
