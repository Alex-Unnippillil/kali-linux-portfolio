import React from 'react';
import UbuntuApp from '../base/ubuntu_app';

class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: '',
            apps: [],
            folders: [
                { id: 'games', title: 'Games', icon: './themes/Yaru/status/New folder/ubuntu_white_hex.svg', isFolder: true }
            ],
            currentFolder: null,
            unfilteredApps: [],
            stack: [],
            category: 0, // 0 for all, 1 for frequent
        };
    }

    componentDidMount() {
        const { apps } = this.props;
        this.setState({ apps, unfilteredApps: apps });
    }

    handleChange = (e) => {
        const value = e.target.value;
        const sourceApps = this.state.currentFolder ? this.props[this.state.currentFolder] : this.state.unfilteredApps;
        const apps =
            value === '' || value === null
                ? sourceApps
                : sourceApps.filter((app) => app.title.toLowerCase().includes(value.toLowerCase()));
        this.setState({ query: value, apps });
    };

    openFolder = (folder) => {
        if (!Array.isArray(folder.apps)) return;
        this.setState((prev) => ({
            stack: [...prev.stack, prev.unfilteredApps],
            apps: folder.apps,
            unfilteredApps: folder.apps,
            query: '',
            currentFolder: folder.id,
        }));
    };

    goBack = () => {
        this.setState((prev) => {
            if (prev.stack.length === 0) return {};
            const previous = prev.stack[prev.stack.length - 1];
            return {
                stack: prev.stack.slice(0, -1),
                apps: previous,
                unfilteredApps: previous,
                query: '',
                currentFolder: null,
            };
        });
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
            />
        ));
    };

    render() {
        return (
            <div className="all-applications">
                <input
                    className="search-bar"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                />
                <div className="apps-container">{this.renderApps()}</div>
            </div>
        );
    }
}


export default AllApplications;

