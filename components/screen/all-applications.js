import React from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import { safeLocalStorage } from '../../utils/safeStorage';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            showPrefs: false,
            showGenericNames: false,
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });

        let showGenericNames = false;
        try {
            const stored = safeLocalStorage?.getItem('whisker-generic-names');
            if (stored !== null) {
                showGenericNames = JSON.parse(stored);
            }
        } catch {
            /* ignore */
        }

        this.setState({
            apps: combined,
            unfilteredApps: combined,
            showGenericNames,
        });
    }

    handleChange = (e) => {
        const value = e.target.value;
        const { unfilteredApps } = this.state;
        const search = value.toLowerCase();
        const apps =
            value === '' || value === null
                ? unfilteredApps
                : unfilteredApps.filter((app) => {
                      return (
                          app.title.toLowerCase().includes(search) ||
                          (app.genericName &&
                              app.genericName.toLowerCase().includes(search))
                      );
                  });
        this.setState({ query: value, apps });
    };

    openApp = (id) => {
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(id);
        }
    };

    togglePrefs = () => {
        this.setState({ showPrefs: !this.state.showPrefs });
    };

    toggleGenericNames = () => {
        const value = !this.state.showGenericNames;
        this.setState({ showGenericNames: value });
        try {
            safeLocalStorage?.setItem(
                'whisker-generic-names',
                JSON.stringify(value)
            );
        } catch {
            /* ignore */
        }
    };

    renderApps = () => {
        const apps = this.state.apps || [];
        return apps.map((app) => (
            <UbuntuApp
                key={app.id}
                name={app.title}
                displayName={
                    this.state.showGenericNames
                        ? app.genericName || app.title
                        : undefined
                }
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
                <div className="absolute top-4 right-4">
                    <button
                        aria-label="Preferences"
                        onClick={this.togglePrefs}
                        className="p-1 rounded hover:bg-white hover:bg-opacity-10 focus:outline-none"
                    >
                        <Image
                            width={24}
                            height={24}
                            src="/themes/Yaru/apps/gnome-control-center.png"
                            alt="Preferences"
                            className="w-6 h-6"
                        />
                    </button>
                    {this.state.showPrefs && (
                        <div className="mt-2 bg-ub-grey text-white border border-gray-500 rounded shadow-lg p-4">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={this.state.showGenericNames}
                                    onChange={this.toggleGenericNames}
                                />
                                <span>Show generic application names</span>
                            </label>
                        </div>
                    )}
                </div>
                <input
                    className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
            </div>
        );
    }
}

export default AllApplications;

