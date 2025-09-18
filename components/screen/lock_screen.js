import React, { useEffect, useRef, useState } from 'react';
import Clock from '../util-components/clock';
import { useSettings } from '../../hooks/useSettings';

const DUMMY_PASSWORD = 'toor';
const DISPLAY_NAME = 'kali';

export default function LockScreen({ isLocked, unLockScreen }) {
    const { wallpaper } = useSettings();
    const passwordRef = useRef(null);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState('');

    useEffect(() => {
        if (!isLocked) {
            setPassword('');
            setAuthError('');
            return undefined;
        }

        const timer = setTimeout(() => {
            passwordRef.current?.focus();
        }, 120);

        return () => clearTimeout(timer);
    }, [isLocked]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (password === DUMMY_PASSWORD) {
            setPassword('');
            setAuthError('');
            unLockScreen?.();
            return;
        }

        setAuthError('Incorrect password. Try again.');
        setPassword('');
        passwordRef.current?.focus();
    };

    const handleContainerInteraction = () => {
        if (isLocked) {
            passwordRef.current?.focus();
        }
    };

    const handleInputKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setPassword('');
            setAuthError('');
        }
    };

    const avatarInitial = DISPLAY_NAME.charAt(0).toUpperCase();

    return (
        <div
            id="ubuntu-lock-screen"
            role="dialog"
            aria-modal={isLocked ? 'true' : 'false'}
            aria-hidden={isLocked ? 'false' : 'true'}
            style={{ zIndex: '100', contentVisibility: 'auto' }}
            className={`lock-screen ${isLocked ? 'lock-screen--visible' : 'lock-screen--hidden'}`}
            onClick={handleContainerInteraction}
            tabIndex={-1}
        >
            <div className="lock-screen__background" aria-hidden="true">
                <img
                    src={`/wallpapers/${wallpaper}.webp`}
                    alt=""
                    className="lock-screen__wallpaper"
                />
                <div className="lock-screen__overlay" />
            </div>

            <div className="lock-screen__content">
                <div className="lock-screen__time">
                    <span className="lock-screen__time-display">
                        <Clock onlyTime={true} />
                    </span>
                    <span className="lock-screen__date-display">
                        <Clock onlyDay={true} />
                    </span>
                </div>

                <section className="lock-screen__auth" aria-label="Unlock session">
                    <div className="lock-screen__avatar" aria-hidden="true">
                        {avatarInitial}
                    </div>
                    <h2 className="lock-screen__user-name">{DISPLAY_NAME}</h2>
                    <form className="lock-screen__form" onSubmit={handleSubmit}>
                        <label className="lock-screen__label" htmlFor="lock-screen-password">
                            Password
                        </label>
                        <input
                            id="lock-screen-password"
                            ref={passwordRef}
                            className="lock-screen__input"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            onKeyDown={handleInputKeyDown}
                            autoComplete="current-password"
                            placeholder="Enter password"
                            aria-invalid={authError ? 'true' : 'false'}
                        />
                        <button type="submit" className="lock-screen__button">
                            Unlock
                        </button>
                        <p className="lock-screen__hint" aria-live="polite">
                            Hint: try "toor"
                        </p>
                        {authError ? (
                            <p role="alert" className="lock-screen__error">
                                {authError}
                            </p>
                        ) : null}
                    </form>
                </section>
            </div>
        </div>
    );
}
