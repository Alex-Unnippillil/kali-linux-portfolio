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
        this.containerRef = React.createRef();
        this.searchInputRef = React.createRef();
    }

    componentDidMount() {
        const { apps = [], games = [] } = this.props;
        const combined = [...apps];
        games.forEach((game) => {
            if (!combined.some((app) => app.id === game.id)) combined.push(game);
        });
        this.setState({ apps: combined, unfilteredApps: combined }, this.focusFirstElement);
        document.addEventListener('focusin', this.handleDocumentFocus, true);
    }

    componentWillUnmount() {
        document.removeEventListener('focusin', this.handleDocumentFocus, true);
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

    getFocusableElements = () => {
        if (!this.containerRef.current) return [];
        const focusableSelectors = [
            'a[href]',
            'button:not([disabled])',
            'textarea:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ];
        return Array.from(
            this.containerRef.current.querySelectorAll(focusableSelectors.join(','))
        ).filter((el) => !el.hasAttribute('aria-hidden'));
    };

    focusFirstElement = () => {
        if (this.searchInputRef.current) {
            this.searchInputRef.current.focus();
            return;
        }
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    };

    handleDocumentFocus = (event) => {
        if (
            this.containerRef.current &&
            !this.containerRef.current.contains(event.target)
        ) {
            this.focusFirstElement();
        }
    };

    handleKeyDown = (event) => {
        if (event.key !== 'Tab') return;
        const focusableElements = this.getFocusableElements();
        if (focusableElements.length === 0) return;

        const { activeElement } = document;
        const currentIndex = focusableElements.indexOf(activeElement);
        let nextIndex = 0;

        if (event.shiftKey) {
            nextIndex =
                currentIndex <= 0
                    ? focusableElements.length - 1
                    : currentIndex - 1;
        } else {
            nextIndex =
                currentIndex === focusableElements.length - 1
                    ? 0
                    : currentIndex + 1;
        }

        focusableElements[nextIndex].focus();
        event.preventDefault();
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
                className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-ub-grey bg-opacity-95 all-apps-anim"
                role="dialog"
                aria-modal="true"
                aria-labelledby="shortcut-selector-title"
                onKeyDown={this.handleKeyDown}
                ref={this.containerRef}
            >
                <h2
                    id="shortcut-selector-title"
                    className="mt-10 text-2xl font-semibold text-white"
                >
                    Select an app shortcut
                </h2>
                <input
                    className="mt-6 mb-8 w-2/3 md:w-1/3 px-4 py-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
                    placeholder="Search"
                    value={this.state.query}
                    onChange={this.handleChange}
                    ref={this.searchInputRef}
                    aria-label="Search shortcuts"
                />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-6 pb-10 place-items-center">
                    {this.renderApps()}
                </div>
                <button
                    className="mb-8 px-4 py-2 rounded bg-black bg-opacity-20 text-white"
                    onClick={this.props.onClose}
                    type="button"
                    aria-label="Cancel shortcut selection"
                >
                    Cancel
                </button>
            </div>
        );
    }
}

export default ShortcutSelector;
