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
