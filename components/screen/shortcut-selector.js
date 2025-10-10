import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

class ShortcutSelector extends React.Component {
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
        document.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
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

    selectApp = (id) => {
        if (typeof this.props.onSelect === 'function') {
            this.props.onSelect(id);
        }
    };

    handleKeyDown = (event) => {
        if (event.key === 'Escape' && typeof this.props.onClose === 'function') {
            this.props.onClose();
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
                openApp={() => this.selectApp(app.id)}
                disabled={app.disabled}
                prefetch={app.screen?.prefetch}
            />
        ));
    };

    render() {
        const { onClose, showBackdrop } = this.props;

        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim" role="dialog" aria-modal="true">
                {showBackdrop ? (
                    <button
                        type="button"
                        className="absolute inset-0 z-0 h-full w-full cursor-default bg-transparent"
                        aria-label="Close shortcut selector"
                        onClick={onClose}
                    />
                ) : null}
                <div className="relative z-10 flex w-full flex-col items-center">
                    <input
                        className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                        placeholder="Search"
                        value={this.state.query}
                        onChange={this.handleChange}
                    />
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                        {this.renderApps()}
                    </div>
                    <button
                        className="mb-8 px-4 py-2 rounded bg-black bg-opacity-20 text-white"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }
}

ShortcutSelector.defaultProps = {
    showBackdrop: false,
};

export default ShortcutSelector;
