import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            unfilteredApps: [],
            prefersReducedMotion: false,
        };
        this.motionQuery = null;
        this._motionListener = null;
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        this.setState({ apps: combined, unfilteredApps: combined });

        if (typeof window !== 'undefined' && window.matchMedia) {
            this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.setState({ prefersReducedMotion: this.motionQuery.matches });
            const handler = (event) => {
                this.setState({ prefersReducedMotion: event.matches });
            };
            this._motionListener = handler;
            if (this.motionQuery.addEventListener) {
                this.motionQuery.addEventListener('change', handler);
            } else if (this.motionQuery.addListener) {
                this.motionQuery.addListener(handler);
            }
        }
    }

    componentWillUnmount() {
        if (this.motionQuery && this._motionListener) {
            if (this.motionQuery.removeEventListener) {
                this.motionQuery.removeEventListener('change', this._motionListener);
            } else if (this.motionQuery.removeListener) {
                this.motionQuery.removeListener(this._motionListener);
            }
        }
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
        const overlayClasses = `fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95${
            this.state.prefersReducedMotion ? '' : ' all-apps-anim'
        }`;

        return (
            <div className={overlayClasses}>
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

