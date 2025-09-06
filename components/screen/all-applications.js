import React from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';

class AllApplications extends React.Component {
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

    openApp = (id) => {
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(id);
        }
    };

    renderApps = () => {
        const apps = this.state.apps || [];
        return apps.map((app) => (
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
            <div className="fixed inset-0 z-50 flex bg-ub-grey bg-opacity-95 all-apps-anim">
                <div className="flex-1 flex flex-col items-center overflow-y-auto">
                    <input
                        className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                        placeholder="Search"
                        aria-label="Search applications"
                        value={this.state.query}
                        onChange={this.handleChange}
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                        {this.renderApps()}
                    </div>
                </div>
                <div className="w-24 flex flex-col items-center justify-end gap-4 p-4 border-l border-black border-opacity-20">
                    <button
                        type="button"
                        aria-label="All Applications"
                        className="opacity-50 cursor-default"
                        disabled
                    >
                        <Image
                            src="/themes/Yaru/system/view-app-grid-symbolic.svg"
                            alt="All Applications"
                            width={24}
                            height={24}
                        />
                    </button>
                    <button
                        type="button"
                        aria-label="Settings"
                        onClick={() => this.openApp('settings')}
                    >
                        <Image
                            src="/themes/Yaru/apps/gnome-control-center.png"
                            alt="Settings"
                            width={24}
                            height={24}
                        />
                    </button>
                    <button
                        type="button"
                        aria-label="Lock"
                        className="opacity-50 cursor-default"
                        disabled
                    >
                        <Image
                            src="/themes/Yaru/status/changes-prevent-symbolic.svg"
                            alt="Lock"
                            width={24}
                            height={24}
                        />
                    </button>
                    <button
                        type="button"
                        aria-label="Log Out"
                        className="opacity-50 cursor-default"
                        disabled
                    >
                        <Image
                            src="/themes/Yaru/status/system-shutdown-symbolic.svg"
                            alt="Log Out"
                            width={24}
                            height={24}
                        />
                    </button>
                </div>
            </div>
        );
    }
}

export default AllApplications;

