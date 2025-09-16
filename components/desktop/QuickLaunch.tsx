import type { DragEvent, FC } from 'react';
import { useEffect, useMemo, useState } from 'react';
import SideBarApp from '../base/side_bar_app';

type QuickLaunchApp = {
    id: string;
    title: string;
    icon: string;
};

type QuickLaunchProps = {
    apps: QuickLaunchApp[];
    pinnedAppIds: string[];
    closedWindows: Record<string, boolean>;
    focusedWindows: Record<string, boolean>;
    minimizedWindows: Record<string, boolean>;
    onLaunch: (id: string) => void;
    onReorder: (ids: string[]) => void;
};

const areOrdersEqual = (a: string[], b: string[]): boolean => (
    a.length === b.length && a.every((id, index) => id === b[index])
);

const reorderIds = (order: string[], draggedId: string, targetId: string): string[] => {
    const next = order.slice();
    const fromIndex = next.indexOf(draggedId);
    const toIndex = next.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return next;
    }
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedId);
    return next;
};

const QuickLaunch: FC<QuickLaunchProps> = ({
    apps,
    pinnedAppIds,
    closedWindows,
    focusedWindows,
    minimizedWindows,
    onLaunch,
    onReorder,
}) => {
    const [order, setOrder] = useState<string[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    useEffect(() => {
        const validIds = new Set(apps.map(app => app.id));
        const sanitized = pinnedAppIds.filter(id => validIds.has(id));
        setOrder(prev => (areOrdersEqual(prev, sanitized) ? prev : sanitized));
    }, [apps, pinnedAppIds]);

    const pinnedApps = useMemo(
        () => order
            .map(id => apps.find(app => app.id === id) || null)
            .filter((app): app is QuickLaunchApp => Boolean(app)),
        [order, apps],
    );

    const commitOrder = () => {
        if (!draggingId) return;
        setDraggingId(null);
        const sanitized = pinnedApps.map(app => app.id);
        if (!areOrdersEqual(sanitized, pinnedAppIds)) {
            onReorder(sanitized);
        }
    };

    const handleDragStart = (id: string) => (event: DragEvent<HTMLDivElement>) => {
        setDraggingId(id);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', id);
    };

    const handleDragEnter = (targetId: string) => (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!draggingId || draggingId === targetId) return;
        setOrder(prev => reorderIds(prev, draggingId, targetId));
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (draggingId) {
            event.dataTransfer.dropEffect = 'move';
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        commitOrder();
    };

    const handleDragEnd = () => {
        commitOrder();
    };

    if (!pinnedApps.length) {
        return null;
    }

    return (
        <div
            role="list"
            aria-label="Pinned applications"
            className="flex w-full flex-col items-center"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {pinnedApps.map((app, index) => {
                const shortcut = index < 9 ? `${index + 1}` : undefined;
                const isDragging = draggingId === app.id;
                return (
                    <div
                        key={app.id}
                        role="listitem"
                        className={`relative flex w-full justify-center ${isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}`}
                        draggable
                        aria-grabbed={isDragging}
                        onDragStart={handleDragStart(app.id)}
                        onDragEnter={handleDragEnter(app.id)}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                    >
                        <SideBarApp
                            id={app.id}
                            title={app.title}
                            icon={app.icon}
                            isClose={closedWindows}
                            isFocus={focusedWindows}
                            openApp={onLaunch}
                            isMinimized={minimizedWindows}
                            shortcutHint={shortcut}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default QuickLaunch;
