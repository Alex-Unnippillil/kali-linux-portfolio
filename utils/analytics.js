import ReactGA from 'react-ga4';
const safeEvent = (...args) => {
    try {
        if (typeof ReactGA?.event === 'function') {
            ReactGA.event(...args);
        }
    }
    catch {
        // Ignore analytics errors
    }
};
export const logEvent = (event) => {
    safeEvent(event);
};
export const logGameStart = (game) => {
    logEvent({ category: game, action: 'start' });
};
export const logGameEnd = (game, label) => {
    logEvent({ category: game, action: 'end', label });
};
export const logGameError = (game, message) => {
    logEvent({ category: game, action: 'error', label: message });
};
