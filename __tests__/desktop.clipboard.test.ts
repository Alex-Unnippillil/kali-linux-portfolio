import { Desktop } from '../components/screen/desktop';

describe('Desktop clipboard payload parsing', () => {
    const createDesktop = () => new Desktop({});

    it('detects app ids from plain text', () => {
        const desktop = createDesktop();
        expect(desktop.parseClipboardPayload('terminal')).toEqual({ type: 'app', id: 'terminal' });
    });

    it('detects app ids with prefix', () => {
        const desktop = createDesktop();
        expect(desktop.parseClipboardPayload('app:terminal')).toEqual({ type: 'app', id: 'terminal' });
    });

    it('detects urls with protocol', () => {
        const desktop = createDesktop();
        expect(desktop.parseClipboardPayload('https://example.com')).toEqual({ type: 'url', url: 'https://example.com/' });
    });

    it('normalises urls without protocol', () => {
        const desktop = createDesktop();
        expect(desktop.parseClipboardPayload('example.org')).toEqual({ type: 'url', url: 'https://example.org/' });
    });

    it('detects urls from JSON payloads and preserves title', () => {
        const desktop = createDesktop();
        expect(
            desktop.parseClipboardPayload('{"url":"https://example.net/path","title":"Example"}')
        ).toEqual({ type: 'url', url: 'https://example.net/path', title: 'Example' });
    });

    it('detects app ids from JSON payloads', () => {
        const desktop = createDesktop();
        expect(desktop.parseClipboardPayload('{"appId":"terminal"}')).toEqual({ type: 'app', id: 'terminal' });
    });

    it('rejects unsupported payloads', () => {
        const desktop = createDesktop();
        expect(desktop.parseClipboardPayload('not-an-app-or-url')).toBeNull();
        expect(desktop.parseClipboardPayload('ftp://example.com')).toBeNull();
    });
});
