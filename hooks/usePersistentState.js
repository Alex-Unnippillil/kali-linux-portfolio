import { useState, useEffect } from 'react';
/**
 * Persist state in localStorage.
 * Safely falls back to the provided initial value if stored data is missing or corrupt.
 * @param key localStorage key
 * @param initial initial value or function returning the initial value
 * @param validator optional function to validate parsed stored value
 */
export default function usePersistentState(key, initial, validator) {
    const getInitial = () => typeof initial === 'function' ? initial() : initial;
    const [state, setState] = useState(() => {
        if (typeof window === 'undefined')
            return getInitial();
        try {
            const stored = window.localStorage.getItem(key);
            if (stored !== null) {
                const parsed = JSON.parse(stored);
                if (!validator || validator(parsed)) {
                    return parsed;
                }
            }
        }
        catch {
            // ignore parsing errors and fall back
        }
        return getInitial();
    });
    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(state));
        }
        catch {
            // ignore write errors
        }
    }, [key, state]);
    const reset = () => setState(getInitial());
    return [state, setState, reset];
}
