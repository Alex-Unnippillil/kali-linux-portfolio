import React from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';

export class AllApplications extends React.Component {
    constructor() {
        super();
        this.state = {
            query: "",
            apps: [],
            category: 0, // 0 for all, 1 for frequent
            folders: [
                { id: 'games', title: 'Games', icon: './themes/Yaru/system/folder.png', isFolder: true }
            ],
            currentFolder: null

            unfilteredApps: [],
            stack: [], // stack of previous folders
            category: 0 // 0 for all, 1 for frequent
        }
    }

    componentDidMount() {
        this.setState({
            apps: this.props.apps,
            unfilteredApps: this.props.apps
        })
    }

    handleChange = (e) => {
        const value = e.target.value;
        const sourceApps = this.state.currentFolder ? this.props[this.state.currentFolder] : this.props.apps;
        this.setState({
            query: value,
            apps: value === "" || value === null
                ? sourceApps
                : sourceApps.filter((app) => app.title.toLowerCase().includes(value.toLowerCase()))
        })
    }

    openFolder = (id) => {
        this.setState({
            currentFolder: id,
            query: "",
            category: 0,
            apps: this.props[id] || []
        })
    }

    closeFolder = () => {
        this.setState({
            currentFolder: null,
            query: "",
            apps: this.props.apps

        const baseApps = this.state.category === 0 ? this.state.unfilteredApps : this.props.apps;
        this.setState({
            query: e.target.value,
            apps: e.target.value === "" || e.target.value === null ?
                baseApps : baseApps.filter(
                    (app) => app.title.toLowerCase().includes(e.target.value.toLowerCase())
                )
        })
    }

    openFolder = (folder) => {
        if (!Array.isArray(folder.apps)) return;
        this.setState(prev => ({
            stack: [...prev.stack, prev.unfilteredApps],
            apps: folder.apps,
            unfilteredApps: folder.apps,
            query: ""
        }));
    }

    goBack = () => {
        this.setState(prev => {
            if (prev.stack.length === 0) return {};
            const previous = prev.stack[prev.stack.length - 1];
            return {
                stack: prev.stack.slice(0, -1),
                apps: previous,
                unfilteredApps: previous,
                query: ""
            };
        });

    openApp = (objId) => {
        let frequentApps = localStorage.getItem('frequentApps') ? JSON.parse(localStorage.getItem('frequentApps')) : [];
        let currentApp = frequentApps.find(app => app.id === objId);
        if (currentApp) {
            frequentApps.forEach((app) => {
                if (app.id === currentApp.id) {
                    app.frequency += 1;
                }
            });
        } else {
            frequentApps.push({ id: objId, frequency: 1 });
        }

        frequentApps.sort((a, b) => {
            if (a.frequency < b.frequency) {
                return 1;
            }
            if (a.frequency > b.frequency) {
                return -1;
            }
            return 0;
        });

        localStorage.setItem("frequentApps", JSON.stringify(frequentApps));

        this.props.openApp(objId);
    }

    renderApps = () => {

        let appsJsx = [];
        let frequentAppsInfo = JSON.parse(localStorage.getItem("frequentApps"));
        let getFrequentApps = () => {
            let frequentApps = [];
            if (frequentAppsInfo) {
                frequentAppsInfo.forEach((app_info) => {
                    let app = this.props.apps.find(app => app.id === app_info.id);
                    if (app) {
                        frequentApps.push(app);
                    }
                })
            }
            return frequentApps;
        }

        let apps = [];
        if (this.state.currentFolder) {
            apps = [...this.state.apps];
        } else {
            apps = this.state.category === 0 ? [...this.state.apps] : getFrequentApps();
            const gameIds = (this.props.games || []).map(g => g.id);
            apps = apps.filter(app => !gameIds.includes(app.id));
        }

        if (!this.state.currentFolder) {
            this.state.folders.forEach((folder, index) => {
                const fProps = {
                    name: folder.title,
                    id: folder.id,
                    icon: folder.icon,
                    openApp: this.openFolder
                };
                appsJsx.push(
                    <UbuntuApp key={`folder-${index}`} {...fProps} />
                );
            });
        }

        apps.forEach((app) => {
            const props = {
                name: app.title,
                id: app.id,
                icon: app.icon,
                openApp: Array.isArray(app.apps) ? this.openFolder.bind(this, app) : this.props.openApp

                openApp: this.openApp
            }

            appsJsx.push(
                <UbuntuApp key={app.id} {...props} />
            );
        });
        return appsJsx;
    }

    handleSwitch = (category) => {
        if (category !== this.state.category) {
            this.setState({
                category: category
            })
        }
    }

    render() {
        return (
            <div className={"absolute h-full top-7 w-full z-20 pl-12 justify-center md:pl-20 border-black border-opacity-60 bg-black bg-opacity-70"}>
                <div className={"flex md:pr-20 pt-5 align-center justify-center"}>
                    {this.state.stack.length > 0 && <div className="text-white mr-2 cursor-pointer" onClick={this.goBack}>Back</div>}
                    <div className={"flex w-2/3 h-full items-center pl-2 pr-2 bg-white border-black border-width-2 rounded-xl overflow-hidden md:w-1/3 "}>
                        <Image
                            className={"w-5 h-5"}
                            alt="search icon"
                            src={'/images/logos/search.png'}
                            width={20}
                            height={20}
                            sizes="20px"
                        />
                        <input className={"w-3/4 p-1 bg-transparent focus:outline-none"}
                            placeholder="Type to Search "
                            value={this.state.query}
                            onChange={this.handleChange} />
                    </div>
                </div>
                {this.state.currentFolder && (
                    <div className={"flex md:px-20 px-5 pt-4"}>
                        <button className={"text-white"} onClick={this.closeFolder}>Back</button>
                    </div>
                )}
                <div className={"grid md:grid-cols-6 md:grid-rows-3 grid-cols-3 grid-rows-6 md:gap-4 gap-1 md:px-20 px-5 pt-10 justify-center"}>
                    {this.renderApps()}
                </div>
                {!this.state.currentFolder && (
                    <div className={"flex align-center justify-center w-full fixed bottom-0 mb-15 pr-20  md:pr-20 "}>
                        <div className={"w-1/4 text-center group text-white bg-transparent cursor-pointer items-center"} onClick={this.handleSwitch.bind(this, 1)}>
                            <h4>Frequent</h4>
                            {this.state.category === 1 ? <div className={"h-1 mt-1 bg-ub-gedit-light self-center"} />
                                : <div className={"h-1 mt-1 bg-transparent group-hover:bg-white "} />}
                        </div>
                        <div className={"w-1/4 text-center group text-white bg-transparent cursor-pointer items-center"} onClick={this.handleSwitch.bind(this, 0)}>
                            <h4>All</h4>
                            {this.state.category === 0 ? <div className={"h-1 mt-1 bg-ub-gedit-light self-center"} />
                                : <div className={"h-1 mt-1 bg-transparent group-hover:bg-white"} />}
                        </div>
                    </div>
                )}
            </div>
        )
    }
}

export default AllApplications;
