export class WindowActionBus {
    constructor({ onOpen, onFocus, onMinimize, onClose }) {
        this.onOpen = onOpen;
        this.onFocus = onFocus;
        this.onMinimize = onMinimize;
        this.onClose = onClose;
    }

    handleEvent = (event) => {
        const detail = event?.detail || {};
        const { action, id, context } = detail;
        if (!id || !action) return;
        switch (action) {
            case 'open':
                if (typeof this.onOpen === 'function') this.onOpen(id, context);
                break;
            case 'focus':
                if (typeof this.onFocus === 'function') this.onFocus(id, context);
                break;
            case 'minimize':
                if (typeof this.onMinimize === 'function') this.onMinimize(id, context);
                break;
            case 'close':
                if (typeof this.onClose === 'function') this.onClose(id, context);
                break;
            default:
                break;
        }
    };

    attach = () => {
        if (typeof window === 'undefined') return;
        window.addEventListener('window-action', this.handleEvent);
    };

    detach = () => {
        if (typeof window === 'undefined') return;
        window.removeEventListener('window-action', this.handleEvent);
    };

    static dispatch(action, payload) {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('window-action', { detail: { action, ...payload } }));
    }
}
