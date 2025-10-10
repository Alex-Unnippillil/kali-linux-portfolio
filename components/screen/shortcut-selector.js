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
        this.overlayRef = React.createRef();
        this.searchRef = React.createRef();
        this.previousActiveElement = null;
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });

        if (typeof document !== 'undefined') {
            const active = document.activeElement;
            if (active && typeof active.focus === 'function') {
                this.previousActiveElement = active;
            }
            document.addEventListener('keydown', this.handleKeyDown);
        }

        this.setState({ apps: combined, unfilteredApps: combined }, () => {
            this.focusSearchInput();
            this.ensureFocusWithinOverlay();
        });
    }

    componentDidUpdate() {
        this.ensureFocusWithinOverlay();
    }

    componentWillUnmount() {
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
            this.previousActiveElement.focus();
        }
    }

    focusSearchInput = () => {
        if (this.searchRef.current && typeof this.searchRef.current.focus === 'function') {
            this.searchRef.current.focus();
        }
    };

    ensureFocusWithinOverlay = () => {
        const overlay = this.overlayRef.current;
        if (!overlay) return;
        const focusable = this.getFocusableElements();
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        if (focusable.length === 0) return;
        if (!active || !overlay.contains(active)) {
            focusable[0].focus();
        }
    };

    getFocusableElements = () => {
        const overlay = this.overlayRef.current;
        if (!overlay) return [];
        const selectors = [
            'a[href]',
            'area[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ];
        const nodes = Array.from(overlay.querySelectorAll(selectors.join(', ')));
        return nodes.filter(
            (node) =>
                !node.hasAttribute('disabled') &&
                node.getAttribute('aria-hidden') !== 'true' &&
                typeof node.focus === 'function'
        );
    };

    handleKeyDown = (event) => {
        if (!this.overlayRef.current) return;

        if (event.key === 'Tab') {
            const focusable = this.getFocusableElements();
            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }

            const active = typeof document !== 'undefined' ? document.activeElement : null;
            const currentIndex = focusable.indexOf(active);
            let nextIndex = currentIndex;

            if (event.shiftKey) {
                nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
            } else {
                nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
            }

            event.preventDefault();
            if (currentIndex === -1) {
                focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
            } else {
                focusable[nextIndex].focus();
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.handleClose();
        }
    };

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

    handleClose = () => {
        if (typeof this.props.onClose === 'function') {
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
        return (
            <div
                ref={this.overlayRef}
                className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim"
                role="dialog"
                aria-modal="true"
            >
                <input
                    ref={this.searchRef}
                    className="mt-10 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                    aria-label="Search shortcuts"
                />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
                <button
                    className="mb-8 px-4 py-2 rounded bg-black bg-opacity-20 text-white"
                    onClick={this.handleClose}
                >
                    Cancel
                </button>
            </div>
        );
    }
}

export default ShortcutSelector;
