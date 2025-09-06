import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

const IconSettings = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 5 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 5a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 5a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19 9c.73 0 1.41.27 1.92.76s.76 1.19.76 1.92-.27 1.41-.76 1.92S19.73 15 19 15h.4z" />
    </svg>
);

const IconLock = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const IconLogout = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const IconPower = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <line x1="12" y1="2" x2="12" y2="12" />
        <path d="M5.09 3.51A10 10 0 1 0 12 2" />
    </svg>
);

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
                        value={this.state.query}
                        onChange={this.handleChange}
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                        {this.renderApps()}
                    </div>
                </div>
                <div className="w-40 border-l border-black border-opacity-20 bg-black bg-opacity-20 flex flex-col justify-end p-4 space-y-2">
                    <button
                        type="button"
                        onClick={() => this.openApp('settings')}
                        className="flex items-center gap-2 px-2 py-1 text-white rounded hover:bg-white hover:bg-opacity-10"
                    >
                        <IconSettings className="w-5 h-5" />
                        <span>Settings</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => alert('Lock screen coming soon')}
                        className="flex items-center gap-2 px-2 py-1 text-white rounded hover:bg-white hover:bg-opacity-10"
                    >
                        <IconLock className="w-5 h-5" />
                        <span>Lock</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => alert('Log out coming soon')}
                        className="flex items-center gap-2 px-2 py-1 text-white rounded hover:bg-white hover:bg-opacity-10"
                    >
                        <IconLogout className="w-5 h-5" />
                        <span>Log Out</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => alert('Power options coming soon')}
                        className="flex items-center gap-2 px-2 py-1 text-white rounded hover:bg-white hover:bg-opacity-10"
                    >
                        <IconPower className="w-5 h-5" />
                        <span>Power</span>
                    </button>
                </div>
            </div>
        );
    }
}

export default AllApplications;

