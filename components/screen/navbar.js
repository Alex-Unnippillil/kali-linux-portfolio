import React, { PureComponent } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import WorkspaceSwitcher from '../panel/WorkspaceSwitcher';
import { NAVBAR_HEIGHT } from '../../utils/uiConstants';
import NotificationBell from '../ui/NotificationBell';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

const SEARCH_STORAGE_KEY = 'navbar-search-recent';
const MAX_RECENT_ITEMS = 8;
const MAX_SEARCH_RESULTS = 12;

const getItemKey = (item) => `${item.type}:${item.id}`;

const fuzzyMatch = (text, rawQuery) => {
        if (!text || !rawQuery) return null;
        const query = rawQuery.toLowerCase();
        const target = text.toLowerCase();
        let searchIndex = 0;
        const positions = [];
        let score = 0;

        for (let i = 0; i < query.length; i += 1) {
                const char = query[i];
                if (char === ' ') {
                        score += 0.1;
                        continue;
                }
                const foundIndex = target.indexOf(char, searchIndex);
                if (foundIndex === -1) {
                        return null;
                }
                positions.push(foundIndex);
                score += 1;
                if (positions.length > 1 && foundIndex === positions[positions.length - 2] + 1) {
                        score += 0.6;
                }
                searchIndex = foundIndex + 1;
        }

        if (!positions.length) return null;

        const spanLength = positions[positions.length - 1] - positions[0] + 1;
        const density = positions.length / spanLength;
        score += density;
        score += positions.length / Math.max(target.length, 1);

        if (target.startsWith(query.trim())) {
                score += 1.5;
        }
        if (target === query.trim()) {
                score += 3;
        }

        return { score, positions };
};

const SYSTEM_COMMAND_ITEMS = [
        {
                type: 'command',
                id: 'lock-screen',
                title: 'Lock Screen',
                subtitle: 'System command',
                description: 'Secure the desktop session and show the lock screen.',
                keywords: ['lock', 'lock screen', 'secure desktop'],
                command: 'lock',
        },
        {
                type: 'command',
                id: 'window-switcher',
                title: 'Switch Window',
                subtitle: 'System command',
                description: 'Open the window switcher to cycle between applications.',
                keywords: ['switch window', 'alt tab', 'windows'],
                command: 'switch-window',
        },
        {
                type: 'command',
                id: 'open-notifications',
                title: 'Open Notifications',
                subtitle: 'System command',
                description: 'Show the latest desktop notifications.',
                keywords: ['notifications', 'alerts', 'messages'],
                command: 'notifications',
        },
];

const buildSearchIndex = () => {
        const searchItems = [];

        apps.forEach((app) => {
                if (!app || app.disabled) return;
                searchItems.push({
                        type: 'app',
                        id: app.id,
                        title: app.title,
                        subtitle: 'Application',
                        description: app.shortDescription || '',
                        icon: app.icon,
                        keywords: [app.id.replace(/[-_]/g, ' ')],
                });
        });

        SYSTEM_COMMAND_ITEMS.forEach((item) => {
                searchItems.push(item);
        });

        const map = new Map();
        searchItems.forEach((item) => {
                map.set(getItemKey(item), item);
        });

        return { items: searchItems, map };
};

const { items: SEARCH_ITEMS, map: SEARCH_ITEM_MAP } = buildSearchIndex();

const areWorkspacesEqual = (next, prev) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                if (next[index] !== prev[index]) {
                        return false;
                }
        }
        return true;
};

const areRunningAppsEqual = (next = [], prev = []) => {
        if (next.length !== prev.length) return false;
        for (let index = 0; index < next.length; index += 1) {
                const a = next[index];
                const b = prev[index];
                if (!b) return false;
                if (
                        a.id !== b.id ||
                        a.title !== b.title ||
                        a.icon !== b.icon ||
                        a.isFocused !== b.isFocused ||
                        a.isMinimized !== b.isMinimized
                ) {
                        return false;
                }
        }
        return true;
};

export default class Navbar extends PureComponent {
        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false,
                        workspaces: [],
                        activeWorkspace: 0,
                        runningApps: [],
                        searchQuery: '',
                        searchResults: [],
                        highlightedIndex: -1,
                        recentSearches: [],
                        isSearchOpen: false,
                };
                this.searchInputRef = React.createRef();
                this.searchContainerRef = React.createRef();
                this.searchListId = 'navbar-search-results';
        }

        componentDidMount() {
                this.initializeSearch();
                if (typeof document !== 'undefined') {
                        document.addEventListener('mousedown', this.handleGlobalPointerDown);
                        document.addEventListener('touchstart', this.handleGlobalPointerDown);
                }
                if (typeof window !== 'undefined') {
                        window.addEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                        window.dispatchEvent(new CustomEvent('workspace-request'));
                }
        }

        componentWillUnmount() {
                if (typeof document !== 'undefined') {
                        document.removeEventListener('mousedown', this.handleGlobalPointerDown);
                        document.removeEventListener('touchstart', this.handleGlobalPointerDown);
                }
                if (typeof window !== 'undefined') {
                        window.removeEventListener('workspace-state', this.handleWorkspaceStateUpdate);
                }
        }

        handleWorkspaceStateUpdate = (event) => {
                const detail = event?.detail || {};
                const { workspaces, activeWorkspace } = detail;
                const nextWorkspaces = Array.isArray(workspaces) ? workspaces : [];
                const nextActiveWorkspace = typeof activeWorkspace === 'number' ? activeWorkspace : 0;
                const nextRunningApps = Array.isArray(detail.runningApps) ? detail.runningApps : [];

                this.setState((previousState) => {
                        const workspacesChanged = !areWorkspacesEqual(nextWorkspaces, previousState.workspaces);
                        const activeChanged = previousState.activeWorkspace !== nextActiveWorkspace;
                        const runningAppsChanged = !areRunningAppsEqual(nextRunningApps, previousState.runningApps);

                        if (!workspacesChanged && !activeChanged && !runningAppsChanged) {
                                return null;
                        }

                        return {
                                workspaces: workspacesChanged ? nextWorkspaces : previousState.workspaces,
                                activeWorkspace: nextActiveWorkspace,
                                runningApps: runningAppsChanged ? nextRunningApps : previousState.runningApps
                        };
                });
        };

        dispatchTaskbarCommand = (detail) => {
                if (typeof window === 'undefined') return;
                window.dispatchEvent(new CustomEvent('taskbar-command', { detail }));
        };

        handleAppButtonClick = (app) => {
                const detail = { appId: app.id, action: 'toggle' };
                this.dispatchTaskbarCommand(detail);
        };

        handleAppButtonKeyDown = (event, app) => {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.handleAppButtonClick(app);
                }
        };

        renderRunningApps = () => {
                const { runningApps } = this.state;
                if (!runningApps.length) return null;

                return (
                        <ul
                                className="flex max-w-[40vw] items-center gap-2 overflow-x-auto rounded-md border border-white/10 bg-[#1b2231]/90 px-2 py-1"
                                role="list"
                                aria-label="Open applications"
                        >
                                {runningApps.map((app) => (
                                        <li key={app.id} className="flex">
                                                {this.renderRunningAppButton(app)}
                                        </li>
                                ))}
                        </ul>
                );
        };

        renderRunningAppButton = (app) => {
                const isActive = !app.isMinimized;
                const isFocused = app.isFocused && isActive;

                return (
                        <button
                                type="button"
                                aria-label={app.title}
                                aria-pressed={isActive}
                                data-context="taskbar"
                                data-app-id={app.id}
                                data-active={isActive ? 'true' : 'false'}
                                onClick={() => this.handleAppButtonClick(app)}
                                onKeyDown={(event) => this.handleAppButtonKeyDown(event, app)}
                                className={`${isFocused ? 'bg-white/20' : 'bg-transparent'} relative flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kali-blue)]`}
                        >
                                <span className="relative inline-flex items-center justify-center">
                                        <Image
                                                src={app.icon}
                                                alt=""
                                                width={28}
                                                height={28}
                                                className="h-6 w-6"
                                        />
                                        {isActive && (
                                                <span
                                                        aria-hidden="true"
                                                        data-testid="running-indicator"
                                                        className="absolute -bottom-1 left-1/2 h-1 w-2 -translate-x-1/2 rounded-full bg-current"
                                                />
                                        )}
                                </span>
                                <span className="hidden whitespace-nowrap text-white md:inline">{app.title}</span>
                        </button>
                );
        };

        handleWorkspaceSelect = (workspaceId) => {
                if (typeof workspaceId !== 'number') return;
                this.setState({ activeWorkspace: workspaceId });
                if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('workspace-select', { detail: { workspaceId } }));
                }
        };

        handleStatusToggle = () => {
                this.setState((state) => ({ status_card: !state.status_card }));
        };

        handleStatusKeyDown = (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        this.handleStatusToggle();
                }
        };

        initializeSearch = () => {
                const storedValue = safeLocalStorage?.getItem(SEARCH_STORAGE_KEY);
                let recentKeys = [];
                if (storedValue) {
                        try {
                                const parsed = JSON.parse(storedValue);
                                if (Array.isArray(parsed)) {
                                        recentKeys = parsed.filter((key) => SEARCH_ITEM_MAP.has(key));
                                }
                        } catch (_error) {
                                recentKeys = [];
                        }
                }

                const searchResults = this.computeResults('', recentKeys);
                this.setState({
                        recentSearches: recentKeys,
                        searchResults,
                        highlightedIndex: searchResults.length ? 0 : -1,
                });
        };

        computeResults = (query, recentOverride) => {
                const trimmedQuery = (query || '').trim().toLowerCase();
                const recentKeys = Array.isArray(recentOverride) ? recentOverride : this.state.recentSearches;

                if (!trimmedQuery) {
                        return recentKeys
                                .map((key) => {
                                        const item = SEARCH_ITEM_MAP.get(key);
                                        if (!item) return null;
                                        return { item, reason: 'recent', match: null, titleMatch: null };
                                })
                                .filter(Boolean);
                }

                const results = [];
                SEARCH_ITEMS.forEach((item) => {
                        const fields = [
                                { value: item.title, weight: 1.3 },
                                { value: item.subtitle, weight: 0.3 },
                        ];
                        if (Array.isArray(item.keywords)) {
                                item.keywords.forEach((keyword) => {
                                        fields.push({ value: keyword, weight: 0.8 });
                                });
                        }

                        let bestMatch = null;
                        fields.forEach((field) => {
                                if (!field.value) return;
                                const match = fuzzyMatch(field.value, trimmedQuery);
                                if (!match) return;
                                let score = match.score * field.weight;
                                const normalizedField = field.value.toLowerCase();
                                if (normalizedField === trimmedQuery) {
                                        score += 3;
                                } else if (normalizedField.startsWith(trimmedQuery)) {
                                        score += 1.5;
                                }
                                if (item.type === 'command' && field.weight >= 1) {
                                        score += 0.5;
                                }
                                if (!bestMatch || score > bestMatch.score) {
                                        bestMatch = { ...match, score };
                                }
                        });

                        if (bestMatch) {
                                const titleMatch = fuzzyMatch(item.title, trimmedQuery);
                                results.push({ item, match: bestMatch, titleMatch, reason: 'result' });
                        }
                });

                results.sort((a, b) => {
                        if (b.match.score !== a.match.score) return b.match.score - a.match.score;
                        return a.item.title.localeCompare(b.item.title);
                });

                return results.slice(0, MAX_SEARCH_RESULTS);
        };

        persistRecentSearches = (recentKeys) => {
                if (!safeLocalStorage) return;
                try {
                        safeLocalStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(recentKeys));
                } catch (_error) {
                        // ignore storage errors
                }
        };

        handleGlobalPointerDown = (event) => {
                if (!this.state.isSearchOpen) return;
                const container = this.searchContainerRef.current;
                if (container && container.contains(event.target)) return;
                this.setState({ isSearchOpen: false, highlightedIndex: -1 });
        };

        resetSearchToRecents = () => {
                const searchResults = this.computeResults('', this.state.recentSearches);
                this.setState({
                        searchQuery: '',
                        searchResults,
                        highlightedIndex: searchResults.length ? 0 : -1,
                });
        };

        handleSearchFocus = () => {
                this.setState((state) => ({
                        isSearchOpen: true,
                        highlightedIndex: state.searchResults.length ? 0 : -1,
                }));
        };

        handleSearchChange = (event) => {
                const nextQuery = event.target.value;
                const searchResults = this.computeResults(nextQuery);
                this.setState({
                        searchQuery: nextQuery,
                        searchResults,
                        highlightedIndex: searchResults.length ? 0 : -1,
                        isSearchOpen: true,
                });
        };

        handleSearchKeyDown = (event) => {
                const { highlightedIndex, searchResults } = this.state;
                if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        if (!searchResults.length) return;
                        const nextIndex = highlightedIndex < searchResults.length - 1 ? highlightedIndex + 1 : 0;
                        this.setState({ highlightedIndex: nextIndex });
                } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        if (!searchResults.length) return;
                        const nextIndex = highlightedIndex > 0 ? highlightedIndex - 1 : searchResults.length - 1;
                        this.setState({ highlightedIndex: nextIndex });
                } else if (event.key === 'Enter') {
                        if (!searchResults.length) return;
                        event.preventDefault();
                        const index = highlightedIndex >= 0 ? highlightedIndex : 0;
                        this.handleSearchSelection(searchResults[index]);
                } else if (event.key === 'Escape') {
                        event.preventDefault();
                        if (this.state.searchQuery) {
                                this.resetSearchToRecents();
                        } else {
                                this.setState({ isSearchOpen: false, highlightedIndex: -1 }, () => {
                                        this.searchInputRef.current?.blur();
                                });
                        }
                }
        };

        handleSearchSelection = (entry) => {
                if (!entry || !entry.item) return;
                const { item } = entry;
                this.executeSearchItem(item);

                this.setState((prevState) => {
                        const key = getItemKey(item);
                        const filtered = prevState.recentSearches.filter((value) => value !== key);
                        const nextRecents = [key, ...filtered].slice(0, MAX_RECENT_ITEMS);
                        this.persistRecentSearches(nextRecents);
                        const searchResults = this.computeResults('', nextRecents);
                        return {
                                recentSearches: nextRecents,
                                searchQuery: '',
                                searchResults,
                                highlightedIndex: searchResults.length ? 0 : -1,
                                isSearchOpen: false,
                        };
                }, () => {
                        this.searchInputRef.current?.blur();
                });
        };

        executeSearchItem = (item) => {
                if (!item) return;
                if (item.type === 'app') {
                        if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('open-app', { detail: item.id }));
                        }
                } else if (item.type === 'command') {
                        this.executeSystemCommand(item.command);
                }
        };

        executeSystemCommand = (command) => {
                if (!command) return;
                switch (command) {
                        case 'lock':
                                if (typeof this.props.lockScreen === 'function') {
                                        this.props.lockScreen();
                                }
                                break;
                        case 'switch-window':
                                if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('window-switcher-open'));
                                }
                                break;
                        case 'notifications':
                                if (typeof window !== 'undefined') {
                                        window.dispatchEvent(
                                                new CustomEvent('notifications-panel', { detail: { action: 'open' } }),
                                        );
                                }
                                break;
                        default:
                                break;
                }
        };

        renderHighlightedText = (text, match) => {
                if (!match || !Array.isArray(match.positions) || !match.positions.length) return text;
                const positions = match.positions.slice().sort((a, b) => a - b);
                const ranges = [];
                let start = positions[0];
                let prev = positions[0];
                for (let i = 1; i < positions.length; i += 1) {
                        const current = positions[i];
                        if (current === prev + 1) {
                                prev = current;
                        } else {
                                ranges.push([start, prev + 1]);
                                start = current;
                                prev = current;
                        }
                }
                ranges.push([start, prev + 1]);

                const segments = [];
                let lastIndex = 0;
                ranges.forEach(([rangeStart, rangeEnd], index) => {
                        if (rangeStart > lastIndex) {
                                segments.push(text.slice(lastIndex, rangeStart));
                        }
                        segments.push(
                                <mark key={`highlight-${rangeStart}-${index}`} className="rounded bg-white/20 px-0.5">
                                        {text.slice(rangeStart, rangeEnd)}
                                </mark>,
                        );
                        lastIndex = rangeEnd;
                });

                if (lastIndex < text.length) {
                        segments.push(text.slice(lastIndex));
                }

                return segments;
        };

        renderSearchResults = () => {
                const { searchResults, highlightedIndex, searchQuery } = this.state;
                if (!searchResults.length) {
                        return (
                                <div className="px-4 py-6 text-center text-xs text-white/70">
                                        {searchQuery.trim()
                                                ? 'No matches. Try a different keyword.'
                                                : 'Start typing to search apps and system commands.'}
                                </div>
                        );
                }

                const listboxProps = {
                        id: this.searchListId,
                        role: 'listbox',
                        className: 'max-h-72 overflow-y-auto py-1',
                };

                return (
                        <ul {...listboxProps}>
                                {searchResults.map((entry, index) => {
                                        const { item, titleMatch, reason } = entry;
                                        const isActive = index === highlightedIndex;
                                        const optionId = `${this.searchListId}-option-${item.id}`;
                                        return (
                                                <li
                                                        key={optionId}
                                                        id={optionId}
                                                        role="option"
                                                        aria-selected={isActive}
                                                        className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition hover:bg-white/10 focus:bg-white/10 ${
                                                                isActive ? 'bg-white/10 text-white' : 'text-white/80'
                                                        }`}
                                                        onMouseEnter={() => this.setState({ highlightedIndex: index })}
                                                        onMouseDown={(event) => {
                                                                event.preventDefault();
                                                                this.handleSearchSelection(entry);
                                                        }}
                                                >
                                                        {item.icon ? (
                                                                <Image
                                                                        src={item.icon}
                                                                        alt=""
                                                                        width={28}
                                                                        height={28}
                                                                        className="h-6 w-6 rounded"
                                                                />
                                                        ) : (
                                                                <span className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-xs uppercase text-white/80">
                                                                        {item.title.slice(0, 2).toUpperCase()}
                                                                </span>
                                                        )}
                                                        <span className="flex flex-col">
                                                                <span className="text-sm font-medium text-white">
                                                                        {this.renderHighlightedText(item.title, titleMatch)}
                                                                </span>
                                                                <span className="text-[0.7rem] uppercase tracking-wide text-ubt-grey">
                                                                        {item.subtitle}
                                                                        {reason === 'recent' ? ' • Recent' : ''}
                                                                </span>
                                                                {item.description ? (
                                                                        <span className="text-xs text-ubt-grey text-opacity-80">
                                                                                {item.description}
                                                                        </span>
                                                                ) : null}
                                                        </span>
                                                </li>
                                        );
                                })}
                        </ul>
                );
        };

        renderSearch = () => {
                const { searchQuery, searchResults, highlightedIndex, isSearchOpen } = this.state;
                const hasResults = searchResults.length > 0;
                const activeOptionId = highlightedIndex >= 0 && hasResults
                        ? `${this.searchListId}-option-${searchResults[highlightedIndex].item.id}`
                        : undefined;

                return (
                        <div ref={this.searchContainerRef} className="relative mx-2 flex min-w-[10rem] max-w-md flex-1 items-center">
                                <input
                                        ref={this.searchInputRef}
                                        type="search"
                                        value={searchQuery}
                                        onFocus={this.handleSearchFocus}
                                        onChange={this.handleSearchChange}
                                        onKeyDown={this.handleSearchKeyDown}
                                        placeholder="Search apps and commands"
                                        aria-label="Search apps and commands"
                                        role="combobox"
                                        aria-haspopup="listbox"
                                        aria-autocomplete="list"
                                        aria-expanded={isSearchOpen}
                                        aria-controls={hasResults ? this.searchListId : undefined}
                                        aria-activedescendant={isSearchOpen ? activeOptionId : undefined}
                                        className="w-full rounded-md border border-white/10 bg-[#1b2231]/80 px-3 py-1.5 text-sm text-white placeholder:text-white/60 shadow-inner transition focus:border-[var(--kali-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-blue)]"
                                />
                                {isSearchOpen && (
                                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-md border border-white/10 bg-[#141b2a]/95 text-white shadow-xl backdrop-blur">
                                                {this.renderSearchResults()}
                                        </div>
                                )}
                        </div>
                );
        };

                render() {
                        const { workspaces, activeWorkspace } = this.state;
                        return (
                                <div
                                        className="main-navbar-vp fixed inset-x-0 top-0 z-50 flex w-full items-center justify-between gap-4 bg-slate-950/80 text-ubt-grey shadow-lg backdrop-blur-md"
                                        style={{
                                                minHeight: `calc(${NAVBAR_HEIGHT}px + var(--safe-area-top, 0px))`,
                                                paddingTop: `calc(var(--safe-area-top, 0px) + 0.5rem)`,
                                                paddingBottom: '0.5rem',
                                                paddingLeft: `calc(0.75rem + var(--safe-area-left, 0px))`,
                                                paddingRight: `calc(0.75rem + var(--safe-area-right, 0px))`,
                                        }}
                                >
                                        <div className="flex min-w-0 items-center gap-2 text-xs md:text-sm">
                                                <WhiskerMenu />
                                                {workspaces.length > 0 && (
                                                        <WorkspaceSwitcher
                                                                workspaces={workspaces}
                                                                activeWorkspace={activeWorkspace}
                                                                onSelect={this.handleWorkspaceSelect}
                                                        />
                                                )}
                                                {this.renderRunningApps()}
                                                <PerformanceGraph />
                                        </div>
                                        {this.renderSearch()}
                                        <div className="flex items-center gap-3 text-xs md:text-sm">
                                                <Clock onlyTime={true} showCalendar={true} hour12={false} variant="minimal" />
                                                <NotificationBell />
                                                <div
                                                        id="status-bar"
                                                        role="button"
                                                        tabIndex={0}
                                                        aria-label="System status"
                                                        aria-expanded={this.state.status_card}
                                                        onClick={this.handleStatusToggle}
                                                        onKeyDown={this.handleStatusKeyDown}
                                                        className={
                                                                'relative rounded-full border border-transparent px-3 py-1 text-xs font-medium text-white/80 transition duration-150 ease-in-out hover:border-white/20 hover:bg-white/10 focus:border-ubb-orange focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300'
                                                        }
                                                >
                                                        <Status />
                                                        <QuickSettings open={this.state.status_card} />
                                                </div>
                                        </div>
                                </div>
                        );
                }


}
