import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { parseDesktopEntry } from '../../lib/xdg/desktop';
import { groupByCategory } from '../../lib/xdg/menu';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            menu: {},
            unfilteredEntries: [],
            appMap: new Map(),
        };
    }

    componentDidMount() {
        const { apps = [], games = [], entries: providedEntries } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        const appMap = new Map(combined.map((app) => [app.id, app]));
        const entries = providedEntries ?? combined.map((app) => parseDesktopEntry(app));
        const menu = groupByCategory(entries);
        this.setState({ appMap, unfilteredEntries: entries, menu });
    }

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredEntries } = this.state;
        const entries =
            value === '' || value === null
                ? unfilteredEntries
                : unfilteredEntries.filter((entry) =>
                      entry.title.toLowerCase().includes(value.toLowerCase())
                  );
        this.setState({ query: value, menu: groupByCategory(entries) });
    };

    openApp = (id) => {
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(id);
        }
    };

    renderMenu = () => {
        const { menu, appMap } = this.state;
        return Object.entries(menu).map(([category, entries]) => (
            <div key={category} className="w-full">
                <h2 className="w-full px-4 mb-4 text-white text-lg font-semibold">
                    {category}
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {entries.map((entry) => {
                        const app = appMap.get(entry.id);
                        if (!app) return null;
                        return (
                            <UbuntuApp
                                key={entry.id}
                                name={app.title}
                                id={app.id}
                                icon={app.icon}
                                openApp={() => this.openApp(app.id)}
                                disabled={app.disabled}
                                prefetch={app.screen?.prefetch}
                            />
                        );
                    })}
                </div>
            </div>
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
                {this.renderMenu()}
            </div>
        );
    }
}

export default AllApplications;
