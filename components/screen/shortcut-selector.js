import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

class ShortcutSelector extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        this.setState({ apps: combined, unfilteredApps: combined });
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
        this.setState({ query: value, apps });
    };

    selectApp = (id) => {
        if (typeof this.props.onSelect === 'function') {
            this.props.onSelect(id);
        }
    };

    renderApps = () => {
        const apps = this.state.apps || [];
        return apps.map((app) => {
            const shouldPrefetch = app.prefetchOnHover !== false;
            return (
                <UbuntuApp
                    key={app.id}
                    name={app.title}
                    id={app.id}
                    icon={app.icon}
                    openApp={() => this.selectApp(app.id)}
                    disabled={app.disabled}
                    prefetch={shouldPrefetch ? app.screen?.prefetch : undefined}
                />
            );
        });
    };

    render() {
        const { onRequestClose } = this.props;
        return (
            <div className="flex h-full flex-col gap-6 text-white">
                <div className="flex flex-col gap-3">
                    <label className="sr-only" htmlFor="shortcut-selector-search">
                        Search applications
                    </label>
                    <input
                        id="shortcut-selector-search"
                        className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-base shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        placeholder="Search"
                        value={this.state.query}
                        onChange={this.handleChange}
                        aria-label="Search applications"
                    />
                </div>
                <div className="grid flex-1 grid-cols-3 gap-6 overflow-y-auto pb-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {this.renderApps()}
                </div>
                <div className="flex justify-end">
                    <button
                        type="button"
                        className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                        onClick={onRequestClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }
}

export default ShortcutSelector;
