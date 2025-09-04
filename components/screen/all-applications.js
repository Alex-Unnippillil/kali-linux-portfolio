import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            categories: [],
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        this.setState({ apps: combined, unfilteredApps: combined });

        fetch('/data/kali/categories.yaml')
            .then((res) => res.text())
            .then((txt) => {
                try {
                    const categories = JSON.parse(txt);
                    this.setState({ categories });
                } catch (e) {
                    console.error('Failed to load categories', e);
                }
            })
            .catch((e) => console.error('Failed to fetch categories', e));
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

    renderCategories = () => {
        const categories = this.state.categories || [];
        return categories.map((cat) => (
            <div key={cat.id} className="flex flex-col items-center mx-4 mb-4">
                <img src={cat.icon} alt="" className="w-8 h-8 mb-1" />
                <span className="text-xs text-white text-center whitespace-nowrap">{cat.name}</span>
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
                <div className="flex flex-wrap justify-center">{this.renderCategories()}</div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
            </div>
        );
    }
}

export default AllApplications;

