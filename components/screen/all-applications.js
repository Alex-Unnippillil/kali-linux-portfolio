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

import React, { Component } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';

class AllApplications extends Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      currentFolder: null,
    };
  }

  handleChange = (e) => {
    this.setState({ query: e.target.value });
  };

  openFolder = (id) => {
    this.setState({ currentFolder: id, query: '' });
  };

  closeFolder = () => {
    this.setState({ currentFolder: null, query: '' });
  };

  filterApps(apps) {
    const { query } = this.state;
    return query
      ? apps.filter((app) => app.title.toLowerCase().includes(query.toLowerCase()))
      : apps;
  }

  renderApps(apps) {
    return apps.map((app) => (
      <div
        key={app.id}
        className="w-24 mx-2 my-4 text-center"
        onDoubleClick={() => this.props.openApp(app.id)}
      >
        <div className="w-16 h-16 mx-auto">
          <Image width={64} height={64} src={app.icon} alt={app.title} />
        </div>
        <span className="text-white text-sm">{app.title}</span>
      </div>
    ));
  }

  render() {
    const { apps, games } = this.props;
    const { currentFolder, query } = this.state;
    const source = currentFolder === 'games' ? games : apps;
    const displayed = this.filterApps(source);

    return (
      <UbuntuApp id="all-apps" className="w-full h-full bg-ub-cool-grey overflow-auto">
        <div className="p-4">
          <input
            className="w-full mb-4 p-2 text-black"
            placeholder="Type to search..."
            value={query}
            onChange={this.handleChange}
          />
          {currentFolder && (
            <button
              className="mb-4 px-2 py-1 bg-gray-700 text-white"
              onClick={this.closeFolder}
            >
              Back
            </button>
          )}
          <div className="flex flex-wrap">
            {!currentFolder && (
              <div
                className="w-24 mx-2 my-4 text-center"
                onDoubleClick={() => this.openFolder('games')}
              >
                <div className="w-16 h-16 mx-auto">
                  <Image
                    width={64}
                    height={64}
                    src="./themes/Yaru/system/folder.png"
                    alt="Games"
                  />
                </div>
                <span className="text-white text-sm">Games</span>
              </div>
            )}
            {this.renderApps(displayed)}
          </div>
        </div>
      </UbuntuApp>
    );
  }

}

export default AllApplications;
