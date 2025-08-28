import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.gridRef = React.createRef();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            focusedIndex: 0,
        };
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        this.setState({ apps: combined, unfilteredApps: combined }, () => {
            if (combined.length > 0) {
                const el = document.getElementById(`app-${combined[0].id}`);
                if (el) el.focus();
            }
        });
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
        this.setState({ query: value, apps, focusedIndex: 0 }, () => {
            if (apps.length > 0) {
                const el = document.getElementById(`app-${apps[0].id}`);
                if (el) el.focus();
            }
        });
    };

    openApp = (id) => {
        if (typeof this.props.openApp === 'function') {
            this.props.openApp(id);
        }
    };

    getColumnCount = () => {
        const grid = this.gridRef.current;
        if (!grid) return 1;
        const cols = window.getComputedStyle(grid).getPropertyValue('grid-template-columns');
        return cols.split(' ').length || 1;
    };

    handleKeyDown = (e, index) => {
        const total = this.state.apps.length;
        if (total === 0) return;
        let next = index;
        const cols = this.getColumnCount();
        if (e.key === 'ArrowRight') {
            next = (index + 1) % total;
        } else if (e.key === 'ArrowLeft') {
            next = (index - 1 + total) % total;
        } else if (e.key === 'ArrowDown') {
            next = Math.min(index + cols, total - 1);
        } else if (e.key === 'ArrowUp') {
            next = Math.max(index - cols, 0);
        } else {
            return;
        }
        e.preventDefault();
        this.setState({ focusedIndex: next }, () => {
            const app = this.state.apps[next];
            const el = document.getElementById(`app-${app.id}`);
            if (el) el.focus();
        });
    };

    renderApps = () => {
        const apps = this.state.apps || [];
        return apps.map((app, index) => (
            <UbuntuApp
                key={app.id}
                name={app.title}
                id={app.id}
                icon={app.icon}
                openApp={() => this.openApp(app.id)}
                tabIndex={this.state.focusedIndex === index ? 0 : -1}
                onKeyDown={(e) => this.handleKeyDown(e, index)}
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
                <div ref={this.gridRef} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
            </div>
        );
    }
}

export default AllApplications;

