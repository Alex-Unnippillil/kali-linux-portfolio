import React from 'react';
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
        this.refreshApps();
        window.addEventListener('launcher-updated', this.refreshApps);
    }

    componentWillUnmount() {
        window.removeEventListener('launcher-updated', this.refreshApps);
    }

    refreshApps = () => {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps.filter(app => !app.hidden)];
        games.forEach((game) => {
            if (!game.hidden && !combined.some((app) => app.id === game.id)) combined.push(game);
        });
        const { query } = this.state;
        const filtered = query === ''
            ? combined
            : combined.filter((app) => app.title.toLowerCase().includes(query.toLowerCase()));
        this.setState({ apps: filtered, unfilteredApps: combined });
    }

    handleChange = (e) => {
        const value = e.target.value;
        this.setState({ query: value }, this.refreshApps);
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
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
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

