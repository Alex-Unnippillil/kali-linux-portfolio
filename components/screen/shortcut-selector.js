import React, { useEffect, useId, useRef, useState } from 'react';
import UbuntuApp from '../base/ubuntu_app';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

const useSelectorColumns = () => {
    const [columns, setColumns] = useState(3);

    useEffect(() => {
        const updateColumns = () => {
            if (typeof window === 'undefined') return;
            const width = window.innerWidth;
            if (width >= 1024) {
                setColumns(8);
            } else if (width >= 768) {
                setColumns(6);
            } else if (width >= 640) {
                setColumns(4);
            } else {
                setColumns(3);
            }
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => {
            window.removeEventListener('resize', updateColumns);
        };
    }, []);

    return columns;
};

const ShortcutGrid = ({ apps, onSelect }) => {
    const columns = useSelectorColumns();
    const hintId = useId();
    const itemRefs = useRef([]);

    useEffect(() => {
        itemRefs.current = itemRefs.current.slice(0, apps.length);
    }, [apps.length]);

    const roving = useRovingTabIndex({
        itemCount: apps.length,
        orientation: 'grid',
        columns,
        enabled: apps.length > 0,
        onActiveChange: (index) => {
            const instance = itemRefs.current[index];
            if (instance && typeof instance.focus === 'function') {
                requestAnimationFrame(() => instance.focus());
            }
        },
    });

    return (
        <div
            role="grid"
            aria-roledescription="Shortcut grid"
            aria-describedby={hintId}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center"
            onKeyDown={roving.onKeyDown}
        >
            <p id={hintId} className="sr-only">
                Use arrow keys to move between shortcuts. Home selects the first app and End selects the last.
            </p>
            {apps.map((app, index) => (
                <UbuntuApp
                    key={app.id}
                    ref={(instance) => {
                        itemRefs.current[index] = instance || null;
                    }}
                    name={app.title}
                    id={app.id}
                    icon={app.icon}
                    openApp={() => onSelect(app.id)}
                    disabled={app.disabled}
                    prefetch={app.screen?.prefetch}
                    focusProps={roving.getItemProps(index)}
                />
            ))}
        </div>
    );
};

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

    render() {
        const apps = this.state.apps || [];
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim">
                <input
                    className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                    aria-label="Search shortcuts"
                />
                <ShortcutGrid apps={apps} onSelect={this.selectApp} />
                <button
                    className="mb-8 px-4 py-2 rounded bg-black bg-opacity-20 text-white"
                    onClick={this.props.onClose}
                >
                    Cancel
                </button>
            </div>
        );
    }
}

export default ShortcutSelector;
