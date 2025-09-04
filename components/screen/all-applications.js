import React from "react";
import UbuntuApp from "../base/ubuntu_app";
import Fuse from "fuse.js";

class AllApplications extends React.Component {
  constructor() {
    super();
    this.state = {
      query: "",
      apps: [],
      unfilteredApps: [],
    };
    this.searchTimer = null;
    this.fuse = null;
  }

  componentDidMount() {
    const { apps = [], games = [] } = this.props;
    const combined = [...apps];
    games.forEach((game) => {
      if (!combined.some((app) => app.id === game.id)) combined.push(game);
    });
    this.fuse = new Fuse(combined, {
      keys: ["title"],
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.4,
    });
    this.setState({ apps: combined, unfilteredApps: combined });
  }

  componentWillUnmount() {
    clearTimeout(this.searchTimer);
  }

  handleChange = (e) => {
    const value = e.target.value;
    this.setState({ query: value });
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.runSearch(value);
    }, 75);
  };

  runSearch = (value) => {
    const { unfilteredApps } = this.state;
    if (!value) {
      this.setState({ apps: unfilteredApps });
      return;
    }
    const lower = value.toLowerCase();
    const results = this.fuse.search(lower, { limit: unfilteredApps.length });
    const ranked = results
      .map(({ item, score }) => {
        let bonus = 0;
        if (item.favourite) bonus += 3;
        if (item.title.toLowerCase().startsWith(lower)) bonus += 2;
        return { item, rank: bonus - (score ?? 0) };
      })
      .sort((a, b) => b.rank - a.rank)
      .map((r) => r.item);
    this.setState({ apps: ranked });
  };

  openApp = (id) => {
    if (typeof this.props.openApp === "function") {
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
          aria-label="Search"
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
