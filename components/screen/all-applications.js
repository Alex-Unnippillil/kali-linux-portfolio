import React from 'react';
import UbuntuApp from '../base/ubuntu_app';
import { getRecent } from '../../utils/recent';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            recent: [],
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        const recentIds = getRecent();
        const recent = recentIds
            .map((id) => combined.find((app) => app.id === id))
            .filter(Boolean);
        this.setState({ apps: combined, unfilteredApps: combined, recent });
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
        const apps = this.state.recent || [];
        return apps.map((app) => (
            <UbuntuApp
                key={'recent-' + app.id}
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
                {this.state.recent.length > 0 && (
                    <div className="mb-8 flex flex-col items-center w-full">
                        <h2 className="mb-4 text-lg">Recently Used</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-4 place-items-center">
                            {this.renderRecent()}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
            </div>
        );
    }
}

export default AllApplications;

