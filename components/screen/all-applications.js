import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            games: [],
            unfilteredApps: [],
            unfilteredGames: [],
            recentLimit: 10,
            pinnedCategories: [],
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        let recentLimit = parseInt(safeLocalStorage?.getItem('recentLimit') || '10', 10);
        if (isNaN(recentLimit)) recentLimit = 10;
        let pinnedCategories = [];
        try {
            pinnedCategories = JSON.parse(safeLocalStorage?.getItem('pinnedCategories') || '[]');
        } catch (e) {
            pinnedCategories = [];
        }
        this.setState({
            apps,
            games,
            unfilteredApps: apps,
            unfilteredGames: games,
            recentLimit,
            pinnedCategories,
        });
    }

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredApps, unfilteredGames } = this.state;
        const apps =
            value === '' || value === null
                ? unfilteredApps
                : unfilteredApps.filter((app) =>
                      app.title.toLowerCase().includes(value.toLowerCase())
                  );
        const games =
            value === '' || value === null
                ? unfilteredGames
                : unfilteredGames.filter((app) =>
                      app.title.toLowerCase().includes(value.toLowerCase())
                  );
        this.setState({ query: value, apps, games });
    };

    openApp = (id) => {
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(id);
        }
    };

    handleRecentLimitChange = (e) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value)) value = 1;
        value = Math.max(1, Math.min(25, value));
        safeLocalStorage?.setItem('recentLimit', value);
        this.setState({ recentLimit: value });
    };

    togglePin = (cat) => {
        this.setState(({ pinnedCategories }) => {
            const idx = pinnedCategories.indexOf(cat);
            const updated = [...pinnedCategories];
            if (idx >= 0) {
                updated.splice(idx, 1);
            } else {
                updated.push(cat);
            }
            safeLocalStorage?.setItem('pinnedCategories', JSON.stringify(updated));
            return { pinnedCategories: updated };
        });
    };

    renderCategory = (key, label, items) => {
        if (!items.length) return null;
        const pinned = this.state.pinnedCategories.includes(key);
        return (
            <div key={key} className="w-full mb-8">
                <div className="flex items-center mb-4">
                    <h2 className="text-white text-xl flex-grow">{label}</h2>
                    <button
                        onClick={() => this.togglePin(key)}
                        className="text-sm px-2 py-1 rounded bg-black bg-opacity-20 text-white"
                    >
                        {pinned ? 'Unpin' : 'Pin'}
                    </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-2 place-items-center">
                    {items.map((app) => (
                        <UbuntuApp
                            key={app.id}
                            name={app.title}
                            id={app.id}
                            icon={app.icon}
                            openApp={() => this.openApp(app.id)}
                            disabled={app.disabled}
                            prefetch={app.screen?.prefetch}
                        />
                    ))}
                </div>
            </div>
        );
    };

    render() {
        const { apps, games, recentLimit, pinnedCategories } = this.state;
        const allApps = [...this.state.unfilteredApps, ...this.state.unfilteredGames];
        const recent = (this.props.recentApps || [])
            .slice(-recentLimit)
            .reverse()
            .map((id) => allApps.find((app) => app.id === id))
            .filter(Boolean);
        const categories = [
            { key: 'recent', label: 'Recent', items: recent },
            { key: 'apps', label: 'Applications', items: apps },
            { key: 'games', label: 'Games', items: games },
        ];
        categories.sort((a, b) => {
            const ai = pinnedCategories.indexOf(a.key);
            const bi = pinnedCategories.indexOf(b.key);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <div className="mt-10 mb-4 w-2/3 md:w-1/3 flex flex-col items-center">
                    <input
                        className="mb-4 w-full px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                        placeholder="Search"
                        value={this.state.query}
                        onChange={this.handleChange}
                    />
                    <div className="flex items-center text-white">
                        <label className="mr-2">Recent Limit:</label>
                        <input
                            type="number"
                            min="1"
                            max="25"
                            value={recentLimit}
                            onChange={this.handleRecentLimitChange}
                            className="w-16 px-2 py-1 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                        />
                    </div>
                </div>
                <div className="w-full px-4 pb-10">
                    {categories.map((cat) =>
                        this.renderCategory(cat.key, cat.label, cat.items)
                    )}
                </div>
            </div>
        );
    }
}

export default AllApplications;

