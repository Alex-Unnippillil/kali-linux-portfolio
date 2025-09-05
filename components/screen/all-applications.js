import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { onRecentFilesChange } from '../../utils/recentFiles';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            recentFiles: [],
        };
        this.unsubscribeRecent = null;
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        this.setState({ apps: combined, unfilteredApps: combined });
        this.unsubscribeRecent = onRecentFilesChange((files) =>
            this.setState({ recentFiles: files }),
        );
    }

    componentWillUnmount() {
        if (this.unsubscribeRecent) this.unsubscribeRecent();
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

    renderRecent = () => {
        const recent = this.state.recentFiles || [];
        if (!recent.length) return null;
        return (
            <div className="mb-8 w-2/3 md:w-1/3">
                <h2 className="mb-2 text-center text-white">Recently Used</h2>
                <ul className="max-h-40 overflow-y-auto rounded bg-black bg-opacity-20 p-2 text-white">
                    {recent.map((f) => (
                        <li key={f.path} className="truncate py-1 text-sm">
                            {f.name}
                        </li>
                    ))}
                </ul>
            </div>
        );
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
                {this.renderRecent()}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
            </div>
        );
    }
}

export default AllApplications;

