import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import Fuse from 'fuse.js';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
        };
        this.searchTimeout = null;
        this.fuse = null;
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        this.fuse = new Fuse(combined, {
            keys: ['title'],
            includeScore: true,
            threshold: 0.4,
        });
        this.setState({ apps: combined, unfilteredApps: combined });
    }

    componentWillUnmount() {
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
    }

    performSearch = (value) => {
        const { unfilteredApps } = this.state;
        if (!this.fuse) {
            this.fuse = new Fuse(unfilteredApps, {
                keys: ['title'],
                includeScore: true,
                threshold: 0.4,
            });
        } else {
            this.fuse.setCollection(unfilteredApps);
        }
        if (!value) {
            this.setState({ apps: unfilteredApps });
            return;
        }
        const lower = value.toLowerCase();
        const results = this.fuse.search(value).map((res) => {
            const app = res.item;
            let weight = 0;
            if (app.favourite) weight += 3;
            if (app.title.toLowerCase().startsWith(lower)) weight += 2;
            return { app, score: res.score ?? 0, weight };
        });
        results.sort((a, b) => {
            if (b.weight !== a.weight) return b.weight - a.weight;
            return a.score - b.score;
        });
        this.setState({ apps: results.map((r) => r.app) });
    };

    handleChange = (e) => {
        const value = e.target.value;
        this.setState({ query: value });
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => this.performSearch(value), 75);
    };

    openApp = (id) => {
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(id);
        }
    };

    renderRecentApps = () => {
        const ids = this.props.recentApps || [];
        const { unfilteredApps } = this.state;
        const recent = ids
            .map((id) => unfilteredApps.find((app) => app.id === id))
            .filter(Boolean);
        return recent.map((app) => (
            <UbuntuApp
                key={`recent-${app.id}`}
                name={app.title}
                id={app.id}
                icon={app.icon}
                openApp={() => this.openApp(app.id)}
                disabled={app.disabled}
                prefetch={app.screen?.prefetch}
            />
        ));
    };

    renderApps = () => {
        const apps = this.state.apps || [];
        const exclude = new Set(this.props.recentApps || []);
        const filtered =
            this.state.query === ''
                ? apps.filter((app) => !exclude.has(app.id))
                : apps;
        return filtered.map((app) => (
            <UbuntuApp
                key={app.id}
                name={app.title}
                id={app.id}
                icon={app.icon}
                openApp={() => this.openApp(app.id)}
                disabled={app.disabled}
                prefetch={app.screen?.prefetch}
            />
        ));
    };

    render() {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <input
                    className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                />
                {!this.state.query && this.props.recentApps && this.props.recentApps.length ? (
                    <>
                        <h2 className="mb-4 text-white">Recently Used</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 mb-8 place-items-center">
                            {this.renderRecentApps()}
                        </div>
                    </>
                ) : null}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
            </div>
        );
    }
}

export default AllApplications;

