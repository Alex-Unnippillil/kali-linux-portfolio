import Image from 'next/image';
import {
    CSSProperties,
    DragEventHandler,
    PointerEventHandler,
    ReactElement,
    ReactNode,
    SyntheticEvent,
    useCallback,
    useState,
} from 'react';

export interface UbuntuAppProps {
    id: string;
    name: string;
    icon: string;
    displayName?: ReactNode;
    openApp?: (id: string) => void;
    disabled?: boolean;
    prefetch?: () => void;
    style?: CSSProperties;
    draggable?: boolean;
    isBeingDragged?: boolean;
    onPointerDown?: PointerEventHandler<HTMLDivElement>;
    onPointerMove?: PointerEventHandler<HTMLDivElement>;
    onPointerUp?: PointerEventHandler<HTMLDivElement>;
    onPointerCancel?: PointerEventHandler<HTMLDivElement>;
}

const iconBaseStyle: CSSProperties = {
    width: 'var(--desktop-icon-width, 6rem)',
    minWidth: 'var(--desktop-icon-width, 6rem)',
    height: 'var(--desktop-icon-height, 5.5rem)',
    minHeight: 'var(--desktop-icon-height, 5.5rem)',
    padding: 'var(--desktop-icon-padding, 0.25rem)',
    fontSize: 'var(--desktop-icon-font-size, 0.75rem)',
    gap: 'var(--desktop-icon-gap, 0.375rem)',
};

const UbuntuApp = ({
    id,
    name,
    icon,
    displayName,
    openApp,
    disabled = false,
    prefetch,
    style,
    draggable = true,
    isBeingDragged = false,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
}: UbuntuAppProps): ReactElement => {
    const [launching, setLaunching] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [prefetched, setPrefetched] = useState(false);

    const handleDragStart = useCallback<DragEventHandler<HTMLDivElement>>(() => {
        setDragging(true);
    }, []);

    const handleDragEnd = useCallback<DragEventHandler<HTMLDivElement>>(() => {
        setDragging(false);
    }, []);

    const handleOpenApp = useCallback(() => {
        if (disabled) return;

        setLaunching(true);
        setTimeout(() => setLaunching(false), 300);
        openApp?.(id);
    }, [disabled, id, openApp]);

    const handlePrefetch = useCallback(() => {
        if (!prefetched) {
            prefetch?.();
            setPrefetched(true);
        }
    }, [prefetched, prefetch]);

    const handleActivate = useCallback(
        (event?: SyntheticEvent | PointerEvent) => {
            if (disabled) return;

            const isDragging = dragging || isBeingDragged;
            if (isDragging) return;

            if (event && typeof event.preventDefault === 'function') {
                event.preventDefault();
            }
            handleOpenApp();
        },
        [disabled, dragging, handleOpenApp, isBeingDragged],
    );

    const handlePointerUpInternal: PointerEventHandler<HTMLDivElement> = useCallback(
        (event) => {
            onPointerUp?.(event);
            if (event.defaultPrevented) return;

            if (event.pointerType === 'touch') {
                handleActivate(event);
            }
        },
        [handleActivate, onPointerUp],
    );

    const combinedStyle: CSSProperties = {
        ...iconBaseStyle,
        ...style,
    };

    const draggingState = dragging || isBeingDragged;

    return (
        <div
            role="button"
            aria-label={name}
            aria-disabled={disabled || undefined}
            data-context="app"
            data-app-id={id}
            draggable={draggable}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={handlePointerUpInternal}
            onPointerCancel={onPointerCancel}
            style={combinedStyle}
            className={`${launching ? ' app-icon-launch ' : ''}${
                draggingState ? ' opacity-70 ' : ''
            } m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none flex flex-col justify-start items-center text-center font-normal text-white transition-hover transition-active`}
            id={`app-${id}`}
            onDoubleClick={handleOpenApp}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleOpenApp();
                }
            }}
            tabIndex={disabled ? -1 : 0}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
        >
            <Image
                width={48}
                height={48}
                className="mb-1"
                style={{
                    width: 'var(--desktop-icon-image, 2.5rem)',
                    height: 'var(--desktop-icon-image, 2.5rem)',
                }}
                src={icon.replace('./', '/')}
                alt={`Kali ${name}`}
                sizes="(max-width: 768px) 48px, 64px"
            />
            {displayName ?? name}
        </div>
    );
};

export default UbuntuApp;
