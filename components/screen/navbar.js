import React, {
        Component,
        useCallback,
        useEffect,
        useId,
        useImperativeHandle,
        useRef,
        useState
} from 'react';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';

const PowerMenuButton = React.forwardRef(
        (
                { onLock, onLogout, onRestart, onSoftReboot, onOpenChange },
                forwardedRef
        ) => {
                const actions = [
                        { id: 'lock', label: 'Lock', icon: '🔒', handler: onLock },
                        { id: 'logout', label: 'Log out', icon: '🚪', handler: onLogout },
                        { id: 'soft-reboot', label: 'Soft reboot', icon: '♻️', handler: onSoftReboot },
                        { id: 'restart', label: 'Restart', icon: '🔁', handler: onRestart }
                ].filter((action) => typeof action.handler === 'function');

                const [open, setOpen] = useState(false);
                const [activeIndex, setActiveIndex] = useState(0);
                const buttonRef = useRef(null);
                const menuRef = useRef(null);
                const itemRefs = useRef([]);
                const menuId = useId();

                const closeMenu = useCallback(
                        (focusButton = false) => {
                                setOpen(false);
                                if (focusButton) {
                                        const focusTarget = () => {
                                                buttonRef.current?.focus();
                                        };
                                        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
                                                window.requestAnimationFrame(focusTarget);
                                        } else {
                                                focusTarget();
                                        }
                                }
                        },
                        []
                );

                useImperativeHandle(
                        forwardedRef,
                        () => ({
                                close: (focusButton = false) => closeMenu(focusButton)
                        }),
                        [closeMenu]
                );

                useEffect(() => {
                        if (typeof onOpenChange === 'function') {
                                onOpenChange(open);
                        }
                }, [open, onOpenChange]);

                useEffect(() => {
                        if (!open) return () => {};
                        const handleClick = (event) => {
                                if (
                                        menuRef.current?.contains(event.target) ||
                                        buttonRef.current?.contains(event.target)
                                ) {
                                        return;
                                }
                                closeMenu(false);
                        };
                        document.addEventListener('mousedown', handleClick);
                        return () => {
                                document.removeEventListener('mousedown', handleClick);
                        };
                }, [open, closeMenu]);

                useEffect(() => {
                        if (!open) return;
                        const current = itemRefs.current[activeIndex];
                        current?.focus();
                }, [open, activeIndex, actions.length]);

                useEffect(() => {
                        if (activeIndex >= actions.length && actions.length) {
                                setActiveIndex(actions.length - 1);
                        }
                }, [actions.length, activeIndex]);

                const openMenu = useCallback(
                        (index = 0) => {
                                if (!actions.length) return;
                                setActiveIndex(Math.max(0, Math.min(index, actions.length - 1)));
                                setOpen(true);
                        },
                        [actions.length]
                );

                const handleButtonClick = useCallback(() => {
                        if (open) {
                                closeMenu(true);
                                return;
                        }
                        openMenu(0);
                }, [closeMenu, open, openMenu]);

                const handleButtonKeyDown = useCallback(
                        (event) => {
                                if (!actions.length) return;
                                if (event.key === 'ArrowDown') {
                                        event.preventDefault();
                                        openMenu(0);
                                } else if (event.key === 'ArrowUp') {
                                        event.preventDefault();
                                        openMenu(actions.length - 1);
                                } else if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        if (open) {
                                                closeMenu(true);
                                        } else {
                                                openMenu(0);
                                        }
                                } else if (event.key === 'Escape' && open) {
                                        event.preventDefault();
                                        closeMenu(true);
                                }
                        },
                        [actions.length, closeMenu, open, openMenu]
                );

                const handleMenuKeyDown = useCallback(
                        (event) => {
                                if (!actions.length) return;
                                if (event.key === 'Escape') {
                                        event.preventDefault();
                                        closeMenu(true);
                                } else if (event.key === 'ArrowDown') {
                                        event.preventDefault();
                                        setActiveIndex((prev) => (prev + 1) % actions.length);
                                } else if (event.key === 'ArrowUp') {
                                        event.preventDefault();
                                        setActiveIndex((prev) => (prev - 1 + actions.length) % actions.length);
                                } else if (event.key === 'Home') {
                                        event.preventDefault();
                                        setActiveIndex(0);
                                } else if (event.key === 'End') {
                                        event.preventDefault();
                                        setActiveIndex(actions.length - 1);
                                } else if (event.key === 'Tab') {
                                        closeMenu(false);
                                }
                        },
                        [actions.length, closeMenu]
                );

                const handleSelect = useCallback(
                        (handler) => {
                                closeMenu(true);
                                if (typeof handler === 'function') {
                                        handler();
                                }
                        },
                        [closeMenu]
                );

                if (!actions.length) {
                        return null;
                }

                itemRefs.current = [];

                return (
                        <div className="relative">
                                <button
                                        type="button"
                                        ref={buttonRef}
                                        aria-haspopup="true"
                                        aria-expanded={open}
                                        aria-controls={`power-menu-${menuId}`}
                                        onClick={handleButtonClick}
                                        onKeyDown={handleButtonKeyDown}
                                        className="pr-3 pl-3 py-1 border-b-2 border-transparent focus:border-ubb-orange outline-none transition duration-100 ease-in-out text-ubt-grey hover:text-white"
                                >
                                        <span className="sr-only">Power menu</span>
                                        <span aria-hidden="true" className="text-lg leading-none">
                                                ⏻
                                        </span>
                                </button>
                                <div
                                        id={`power-menu-${menuId}`}
                                        role="menu"
                                        ref={menuRef}
                                        tabIndex={-1}
                                        onKeyDown={handleMenuKeyDown}
                                        className={`${open ? 'block' : 'hidden'} absolute right-0 mt-2 w-44 bg-ub-cool-grey text-white rounded-md border border-black border-opacity-20 shadow-lg z-50 focus:outline-none`}
                                >
                                        <ul role="none">
                                                {actions.map((action, index) => (
                                                        <li role="none" key={action.id}>
                                                                <button
                                                                        type="button"
                                                                        role="menuitem"
                                                                        ref={(node) => {
                                                                                itemRefs.current[index] = node;
                                                                        }}
                                                                        onClick={() => handleSelect(action.handler)}
                                                                        className="flex w-full items-center px-4 py-2 text-left text-sm hover:bg-ub-warm-grey hover:bg-opacity-20 focus:bg-ub-warm-grey focus:bg-opacity-20 focus:outline-none"
                                                                >
                                                                        <span aria-hidden="true" className="mr-2">
                                                                                {action.icon}
                                                                        </span>
                                                                        <span>{action.label}</span>
                                                                </button>
                                                        </li>
                                                ))}
                                        </ul>
                                </div>
                        </div>
                );
        }
);
PowerMenuButton.displayName = 'PowerMenuButton';


export default class Navbar extends Component {
        constructor() {
                super();
                this.state = {
                        status_card: false,
                        applicationsMenuOpen: false,
                        placesMenuOpen: false
                };
                this.powerMenuRef = React.createRef();
        }

                render() {
                        const { lockScreen, logOut, restart, softReboot } = this.props;
                        return (
                                <div className="main-navbar-vp absolute top-0 right-0 w-screen shadow-md flex flex-nowrap justify-between items-center bg-ub-grey text-ubt-grey text-sm select-none z-50">
                                        <div className="flex items-center">
                                                <WhiskerMenu />
                                                <PerformanceGraph />
                                        </div>
                                        <div
                                                className={
                                                        'pl-2 pr-2 text-xs md:text-sm outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1'
                                                }
                                        >
                                                <Clock />
                                        </div>
                                        <div className="flex items-center">
                                                <PowerMenuButton
                                                        ref={this.powerMenuRef}
                                                        onLock={lockScreen}
                                                        onLogout={logOut}
                                                        onRestart={restart}
                                                        onSoftReboot={softReboot}
                                                        onOpenChange={(open) => {
                                                                if (open && this.state.status_card) {
                                                                        this.setState({ status_card: false });
                                                                }
                                                        }}
                                                />
                                                <button
                                                        type="button"
                                                        id="status-bar"
                                                        aria-label="System status"
                                                        onClick={() => {
                                                                this.powerMenuRef.current?.close();
                                                                this.setState({ status_card: !this.state.status_card });
                                                        }}
                                                        className={
                                                                'relative pr-3 pl-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent focus:border-ubb-orange py-1 '
                                                        }
                                                >
                                                        <Status />
                                                        <QuickSettings open={this.state.status_card} />
                                                </button>
                                        </div>
                                </div>
                        );
                }


}
