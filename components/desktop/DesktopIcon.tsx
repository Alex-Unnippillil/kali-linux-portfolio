import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface DesktopIconProps {
    name: string;
    id: string;
    icon: string;
    openApp: (id: string) => void;
    disabled?: boolean;
    displayName?: string;
    prefetch?: () => void;
}

const DesktopIcon: React.FC<DesktopIconProps> = ({ name, id, icon, openApp, disabled, displayName, prefetch }) => {
    const [launching, setLaunching] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [prefetched, setPrefetched] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [caption, setCaption] = useState(displayName || name);
    const [tempName, setTempName] = useState(displayName || name);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragStart = () => setDragging(true);
    const handleDragEnd = () => setDragging(false);

    const open = () => {
        if (disabled) return;
        setLaunching(true);
        setTimeout(() => setLaunching(false), 300);
        openApp(id);
    };

    const handlePrefetch = () => {
        if (!prefetched && typeof prefetch === 'function') {
            prefetch();
            setPrefetched(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (isRenaming) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
        } else if (e.key === 'F2') {
            e.preventDefault();
            setTempName(caption);
            setIsRenaming(true);
        }
    };

    useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const commitRename = () => {
        const newName = tempName.trim();
        if (newName) {
            setCaption(newName);
        }
        setIsRenaming(false);
    };

    const cancelRename = () => {
        setTempName(caption);
        setIsRenaming(false);
    };

    const handleRenameKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (tempName.trim()) {
                commitRename();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelRename();
        }
    };

    return (
        <div
            role="button"
            aria-label={caption}
            aria-disabled={disabled}
            data-context="app"
            data-app-id={id}
            draggable={!isRenaming}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={(launching ? ' app-icon-launch ' : '') + (dragging ? ' opacity-70 ' : '') +
                ' p-1 m-px z-10 bg-white bg-opacity-0 hover:bg-opacity-20 focus:bg-white focus:bg-opacity-50 focus:border-yellow-700 focus:border-opacity-100 border border-transparent outline-none rounded select-none w-24 h-20 flex flex-col justify-start items-center text-center text-xs font-normal text-white transition-hover transition-active '}
            id={'app-' + id}
            onDoubleClick={open}
            onKeyDown={handleKeyDown}
            tabIndex={disabled ? -1 : 0}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
        >
            <Image
                width={40}
                height={40}
                className="mb-1 w-10"
                src={icon.replace('./', '/')}
                alt={'Kali ' + caption}
                sizes="40px"
            />
            {isRenaming ? (
                <input
                    ref={inputRef}
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={handleRenameKey}
                    className="w-full text-center text-xs text-black"
                />
            ) : (
                caption
            )}
        </div>
    );
};

export default DesktopIcon;

