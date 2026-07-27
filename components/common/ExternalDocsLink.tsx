import React, {
    AnchorHTMLAttributes,
    forwardRef,
    MouseEvent,
    useCallback,
    useId,
    useMemo,
    useState
} from 'react';
import Modal from '../base/Modal';

type PreferenceScope = 'domain' | 'url';

type PreferenceStore = {
    domain: Record<string, boolean>;
    url: Record<string, boolean>;
};

type UTMKeys =
    | 'utm_source'
    | 'utm_medium'
    | 'utm_campaign'
    | 'utm_content'
    | 'utm_term';

type UTMParams = Partial<Record<UTMKeys, string>>;

interface ExternalDocsLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string;
    /**
     * Optional overrides for the tracking parameters appended to outbound links.
     */
    utmParams?: UTMParams;
    /**
     * Custom title displayed at the top of the confirmation dialog.
     */
    confirmTitle?: string;
    /**
     * Custom body copy for the confirmation dialog.
     */
    confirmBody?: string;
    /**
     * Initial preference scope when the remember toggle is activated.
     */
    defaultRememberScope?: PreferenceScope;
}

const STORAGE_KEY = 'external-docs:preferences';

const DEFAULT_UTM: Record<UTMKeys, string> = {
    utm_source: 'kali-portfolio',
    utm_medium: 'external-link',
    utm_campaign: 'documentation',
    utm_content: 'external-link',
    utm_term: 'navigation'
};

function createEmptyStore(): PreferenceStore {
    return { domain: {}, url: {} };
}

function readStore(): PreferenceStore {
    if (typeof window === 'undefined') {
        return createEmptyStore();
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return createEmptyStore();
        }
        const parsed = JSON.parse(raw) as PreferenceStore;
        return {
            domain: parsed?.domain ? { ...parsed.domain } : {},
            url: parsed?.url ? { ...parsed.url } : {}
        };
    } catch (error) {
        console.warn('Failed to read external link preferences', error);
        return createEmptyStore();
    }
}

function writeStore(store: PreferenceStore): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
        console.warn('Failed to persist external link preference', error);
    }
}

function markTrusted(scope: PreferenceScope, url: URL): void {
    if (typeof window === 'undefined') {
        return;
    }
    const store = readStore();
    if (scope === 'domain') {
        store.domain[url.host] = true;
    } else {
        store.url[url.href] = true;
    }
    writeStore(store);
}

function hasTrusted(url: URL): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    const store = readStore();
    return Boolean(store.url[url.href] || store.domain[url.host]);
}

function isHttpUrl(url: URL): boolean {
    return url.protocol === 'http:' || url.protocol === 'https:';
}

function isExternal(url: URL): boolean {
    if (!isHttpUrl(url)) {
        return false;
    }
    if (typeof window === 'undefined') {
        return true;
    }
    try {
        return url.origin !== window.location.origin;
    } catch {
        return true;
    }
}

function applyTrackingParams(url: URL, overrides?: UTMParams): string {
    if (!isHttpUrl(url)) {
        return url.toString();
    }
    const tracked = new URL(url.toString());
    const params: Partial<Record<UTMKeys, string>> = { ...DEFAULT_UTM, ...overrides };
    (Object.entries(params) as [UTMKeys, string | undefined][]).forEach(([key, value]) => {
        if (!value) return;
        tracked.searchParams.set(key, value);
    });
    return tracked.toString();
}

function mergeRel(rel?: string): string {
    const required = ['noopener', 'noreferrer'];
    const parts = new Set<string>();
    if (rel) {
        rel
            .split(/\s+/)
            .filter(Boolean)
            .forEach((part) => parts.add(part));
    }
    required.forEach((item) => parts.add(item));
    return Array.from(parts).join(' ');
}

const ExternalDocsLink = forwardRef<HTMLAnchorElement, ExternalDocsLinkProps>(
    (
        {
            children,
            href,
            utmParams,
            confirmTitle = 'Open external link?',
            confirmBody,
            defaultRememberScope = 'domain',
            onClick,
            rel,
            target,
            ...rest
        },
        ref
    ) => {
        const [dialogOpen, setDialogOpen] = useState(false);
        const [pendingUrl, setPendingUrl] = useState<URL | null>(null);
        const [rememberChoice, setRememberChoice] = useState(false);
        const [rememberScope, setRememberScope] = useState<PreferenceScope>(defaultRememberScope);

        const headingId = useId();
        const descriptionId = useId();

        const relValue = useMemo(() => mergeRel(rel), [rel]);
        const targetValue = target ?? '_blank';
        const scopeGroupName = useMemo(() => `${headingId}-scope`, [headingId]);
        const rememberId = useMemo(() => `${headingId}-remember`, [headingId]);
        const domainId = useMemo(() => `${headingId}-domain`, [headingId]);
        const urlId = useMemo(() => `${headingId}-url`, [headingId]);

        const domainLabel = useMemo(() => {
            if (!pendingUrl) {
                return '';
            }
            return pendingUrl.host;
        }, [pendingUrl]);

        const closeDialog = useCallback(() => {
            setDialogOpen(false);
            setPendingUrl(null);
            setRememberChoice(false);
            setRememberScope(defaultRememberScope);
        }, [defaultRememberScope]);

        const proceedToLink = useCallback(
            (url: URL) => {
                const destination = applyTrackingParams(url, utmParams);
                window.open(destination, '_blank', 'noopener,noreferrer');
            },
            [utmParams]
        );

        const handleConfirm = useCallback(() => {
            if (!pendingUrl) return;
            if (rememberChoice) {
                markTrusted(rememberScope, pendingUrl);
            }
            proceedToLink(pendingUrl);
            closeDialog();
        }, [pendingUrl, rememberChoice, rememberScope, proceedToLink, closeDialog]);

        const handleCancel = useCallback(() => {
            closeDialog();
        }, [closeDialog]);

        const handleInteraction = useCallback(
            (event: MouseEvent<HTMLAnchorElement>) => {
                onClick?.(event);
                if (event.defaultPrevented) {
                    return;
                }
                if (!href) {
                    return;
                }
                if (typeof window === 'undefined') {
                    return;
                }
                let url: URL;
                try {
                    url = new URL(href, window.location.href);
                } catch {
                    return;
                }
                if (!isExternal(url)) {
                    return;
                }
                event.preventDefault();
                if (hasTrusted(url)) {
                    proceedToLink(url);
                    return;
                }
                setPendingUrl(url);
                setDialogOpen(true);
            },
            [href, onClick, proceedToLink]
        );

        const bodyText = useMemo(() => {
            if (confirmBody) return confirmBody;
            if (!pendingUrl) return 'This link will open in a new tab.';
            return `You're about to open ${pendingUrl.host} in a new tab.`;
        }, [confirmBody, pendingUrl]);

        return (
            <>
                <a
                    {...rest}
                    href={href}
                    ref={ref}
                    rel={relValue}
                    target={targetValue}
                    onClick={handleInteraction}
                >
                    {children}
                </a>
                <Modal
                    isOpen={dialogOpen}
                    onClose={handleCancel}
                    ariaLabelledby={headingId}
                    ariaDescribedby={descriptionId}
                >
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
                        <div className="relative z-10 w-full max-w-md rounded-lg bg-ubt-bg px-6 py-5 shadow-xl focus:outline-none">
                            <h2 id={headingId} className="text-lg font-semibold text-ubt-off-white">
                                {confirmTitle}
                            </h2>
                            <p id={descriptionId} className="mt-2 text-sm text-ubt-text">
                                {bodyText}
                            </p>
                            <div className="mt-4 flex items-center gap-2 text-sm text-ubt-text">
                                <input
                                    id={rememberId}
                                    type="checkbox"
                                    className="h-4 w-4 accent-ub-orange"
                                    checked={rememberChoice}
                                    onChange={(event) => setRememberChoice(event.target.checked)}
                                    aria-label="Remember my choice"
                                />
                                <label htmlFor={rememberId}>Remember my choice</label>
                            </div>
                            {rememberChoice ? (
                                <fieldset className="mt-3 space-y-2 text-sm text-ubt-text">
                                    <legend className="sr-only">Remember preference scope</legend>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id={domainId}
                                            type="radio"
                                            name={scopeGroupName}
                                            value="domain"
                                            checked={rememberScope === 'domain'}
                                            onChange={() => setRememberScope('domain')}
                                            className="h-4 w-4 accent-ub-orange"
                                            aria-label="Remember for this domain"
                                        />
                                        <label htmlFor={domainId}>
                                            Remember for this domain {domainLabel && `(${domainLabel})`}
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            id={urlId}
                                            type="radio"
                                            name={scopeGroupName}
                                            value="url"
                                            checked={rememberScope === 'url'}
                                            onChange={() => setRememberScope('url')}
                                            className="h-4 w-4 accent-ub-orange"
                                            aria-label="Remember for this exact link"
                                        />
                                        <label htmlFor={urlId}>Remember for this exact link</label>
                                    </div>
                                </fieldset>
                            ) : null}
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="rounded-md border border-ubt-cool-grey px-4 py-2 text-sm text-ubt-off-white transition hover:bg-ubt-cool-grey/30 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="rounded-md bg-ub-orange px-4 py-2 text-sm font-semibold text-black transition hover:bg-ub-orange/90 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                                    onClick={handleConfirm}
                                >
                                    Open link
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            </>
        );
    }
);

ExternalDocsLink.displayName = 'ExternalDocsLink';

export default ExternalDocsLink;
