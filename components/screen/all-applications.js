import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { parseDesktopEntry } from '../../lib/xdg/desktop';
import { buildMenu } from '../../lib/xdg/menu';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            menu: {},
            unfilteredMenu: {},
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        const entries = combined.map((app) => ({
            ...parseDesktopEntry({
                Name: app.title,
                Exec: app.id,
                Icon: app.icon,
                Categories: app.categories || [],
            }),
            disabled: app.disabled,
            prefetch: app.screen?.prefetch,
        }));
        const menu = buildMenu(entries);
        this.setState({ menu, unfilteredMenu: menu });
    }

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredMenu } = this.state;
        const allEntries = Object.values(unfilteredMenu).flat();
        const filtered =
            value === '' || value === null
                ? allEntries
                : allEntries.filter((app) =>
                      app.name.toLowerCase().includes(value.toLowerCase())
                  );
        const menu = buildMenu(filtered);
        this.setState({ query: value, menu });
    };

    openApp = (id) => {
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(id);
        }
    };

    renderApps = () => {
        const menu = this.state.menu || {};
        return Object.entries(menu).map(([category, apps]) => (
            <section key={category} className="w-full mb-4">
                <h2 className="mb-2 text-lg font-bold text-white">{category}</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-2 place-items-center">
                    {apps.map((app) => (
                        <UbuntuApp
                            key={app.exec}
                            name={app.name}
                            id={app.exec}
                            icon={app.icon}
                            openApp={() => this.openApp(app.exec)}
                            disabled={app.disabled}
                            prefetch={app.prefetch}
                        />
                    ))}
                </div>
            </section>
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
                <div className="w-full px-4 pb-10">
                    {this.renderApps()}
                </div>
            </div>
        );
    }
}

export default AllApplications;

