"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HelpPanel from '../HelpPanel';
import useWorkspaceStore from '../../hooks/useWorkspaceStore';
import {
  DesktopGroup,
  DesktopWindow,
  DesktopWindowSeed,
  GroupId,
  WorkspaceId,
} from '../../types/desktop';

const WINDOW_DRAG_TYPE = 'application/x-desktop-window';
const GROUP_DRAG_TYPE = 'application/x-desktop-group';

interface DesktopWindowsProps {
  workspaceId?: WorkspaceId;
  initialWindows?: DesktopWindowSeed[];
}

const formatGroupName = (title: string, fallbackIndex: number) => {
  const trimmed = title.trim();
  if (!trimmed) return `Group ${fallbackIndex}`;
  const firstWord = trimmed.split(/\s+/)[0];
  return `${firstWord} Stack`;
};

const iconFallback = (title: string) => title.trim().slice(0, 1).toUpperCase() || '?';

const DesktopWindowCard = ({
  window: win,
  onDragStart,
  onDragEnd,
  onDrop,
  onClose,
  onFocus,
}: {
  window: DesktopWindow;
  onDragStart: (windowId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onDrop: (windowId: string) => (event: React.DragEvent<HTMLDivElement>) => void;
  onClose: (windowId: string) => void;
  onFocus: (windowId: string) => void;
}) => (
  <div
    key={win.id}
    draggable
    onDragStart={onDragStart(win.id)}
    onDragEnd={onDragEnd}
    onDrop={onDrop(win.id)}
    onDragOver={(event) => {
      if (event.dataTransfer.types.includes(WINDOW_DRAG_TYPE)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    }}
    onClick={() => onFocus(win.id)}
    className={`flex flex-col rounded border border-gray-700 bg-gray-900/80 text-gray-100 shadow-lg transition-shadow focus:outline-none focus:ring ${
      win.groupId ? 'ring-2 ring-ub-orange' : ''
    }`}
    role="listitem"
  >
    <div className="flex items-center justify-between gap-2 border-b border-gray-700 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 truncate">
        {win.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={win.icon} alt="" className="h-5 w-5" />
        ) : (
          <span className="grid h-5 w-5 place-items-center rounded bg-gray-700 text-xs">
            {iconFallback(win.title)}
          </span>
        )}
        <span className="truncate" title={win.title}>
          {win.title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {win.groupId && (
          <span className="rounded bg-gray-800 px-2 py-0.5 text-xs" aria-label="Group">
            {win.groupIndex !== null ? `#${win.groupIndex + 1}` : '#'}
          </span>
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose(win.id);
          }}
          aria-label={`Close ${win.title}`}
          className="rounded px-1 py-0.5 text-xs text-gray-300 transition hover:bg-red-600 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
    <div className="flex flex-1 flex-col gap-2 p-3 text-xs">
      <p className="text-gray-400">
        Workspace order: <span className="text-gray-200">{win.order + 1}</span>
      </p>
      <p className="text-gray-400">
        Position: <span className="text-gray-200">{win.bounds.x.toFixed(0)}×{win.bounds.y.toFixed(0)}</span>
      </p>
      <p className="text-gray-400">
        Size: <span className="text-gray-200">{win.bounds.width.toFixed(0)}×{win.bounds.height.toFixed(0)}</span>
      </p>
      {win.groupId ? (
        <p className="text-gray-400">
          Group ID: <span className="text-gray-200">{win.groupId}</span>
        </p>
      ) : (
        <p className="text-gray-500">Not grouped</p>
      )}
    </div>
  </div>
);

const GroupChip = ({
  id,
  name,
  members,
  onDrop,
  onDragStart,
  onRename,
  onDissolve,
  index,
}: {
  id: GroupId;
  name: string;
  members: DesktopWindow[];
  onDrop: (groupId: GroupId, index: number) => (event: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (groupId: GroupId) => (event: React.DragEvent<HTMLDivElement>) => void;
  onRename: (groupId: GroupId, currentName: string) => void;
  onDissolve: (groupId: GroupId) => void;
  index: number;
}) => (
  <div
    key={id}
    className="flex min-w-[9rem] flex-col gap-2 rounded border border-gray-700 bg-gray-900/80 p-2 text-sm text-gray-100 shadow"
    draggable
    onDragStart={onDragStart(id)}
    onDrop={onDrop(id, index)}
    onDragOver={(event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }}
    role="listitem"
  >
    <div className="flex items-center justify-between gap-1">
      <span className="truncate" title={name}>
        {name}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onRename(id, name)}
          className="rounded px-1 text-xs text-gray-300 transition hover:bg-gray-700"
          aria-label={`Rename ${name}`}
        >
          ✎
        </button>
        <button
          type="button"
          onClick={() => onDissolve(id)}
          className="rounded px-1 text-xs text-gray-300 transition hover:bg-red-600 hover:text-white"
          aria-label={`Dissolve ${name}`}
        >
          ⌦
        </button>
      </div>
    </div>
    <div className="flex items-center gap-1" aria-label={`Windows in ${name}`}>
      {members.map((member) => (
        <div key={member.id} className="flex h-7 w-7 items-center justify-center rounded bg-gray-800">
          {member.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.icon} alt="" className="h-5 w-5" />
          ) : (
            <span className="text-xs text-gray-200">{iconFallback(member.title)}</span>
          )}
        </div>
      ))}
      {members.length === 0 && <span className="text-xs text-gray-400">Empty</span>}
    </div>
  </div>
);

const DesktopWindows: React.FC<DesktopWindowsProps> = ({ workspaceId, initialWindows = [] }) => {
  const {
    activeWorkspace,
    activeWorkspaceId,
    setActiveWorkspace,
    openWindow,
    closeWindow,
    focusWindow,
    moveWindowToGroup,
    createGroup,
    renameGroup,
    dissolveGroup,
    moveGroup,
  } = useWorkspaceStore();

  const [draggingWindow, setDraggingWindow] = useState<string | null>(null);
  const seededInitialWindows = useRef(false);

  useEffect(() => {
    if (workspaceId && workspaceId !== activeWorkspaceId) {
      setActiveWorkspace(workspaceId);
    }
  }, [workspaceId, activeWorkspaceId, setActiveWorkspace]);

  useEffect(() => {
    seededInitialWindows.current = false;
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (seededInitialWindows.current) return;
    if (!initialWindows.length) return;
    initialWindows.forEach((seed, index) => {
      if (!activeWorkspace.windows[seed.id]) {
        openWindow({
          ...seed,
          bounds: {
            x: seed.bounds?.x ?? 120 + index * 40,
            y: seed.bounds?.y ?? 120 + index * 32,
            width: seed.bounds?.width ?? 720,
            height: seed.bounds?.height ?? 480,
          },
        });
      }
    });
    seededInitialWindows.current = true;
  }, [initialWindows, activeWorkspace.windows, openWindow]);

  const windows = useMemo(
    () =>
      activeWorkspace.windowOrder
        .map((id) => activeWorkspace.windows[id])
        .filter((win): win is DesktopWindow => Boolean(win)),
    [activeWorkspace],
  );

  const groups = useMemo(
    () =>
      activeWorkspace.groupOrder
        .map((id) => {
          const group = activeWorkspace.groups[id];
          if (!group) return null;
          const members = group.windowIds
            .map((windowId) => activeWorkspace.windows[windowId])
            .filter((win): win is DesktopWindow => Boolean(win));
          return { group, members } as { group: DesktopGroup; members: DesktopWindow[] };
        })
        .filter((entry): entry is { group: DesktopGroup; members: DesktopWindow[] } => Boolean(entry)),
    [activeWorkspace],
  );

  const onWindowDragStart = useCallback(
    (windowId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData(WINDOW_DRAG_TYPE, windowId);
      event.dataTransfer.effectAllowed = 'move';
      setDraggingWindow(windowId);
    },
    [],
  );

  const onWindowDrop = useCallback(
    (targetId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer.types.includes(WINDOW_DRAG_TYPE)) return;
      event.preventDefault();
      const sourceId = event.dataTransfer.getData(WINDOW_DRAG_TYPE);
      setDraggingWindow(null);
      if (!sourceId || sourceId === targetId) return;
      const target = activeWorkspace.windows[targetId];
      const source = activeWorkspace.windows[sourceId];
      if (!target || !source) return;

      if (target.groupId) {
        moveWindowToGroup(sourceId, target.groupId);
        return;
      }

      const defaultName = formatGroupName(target.title, groups.length + 1);
      const created = createGroup(defaultName, [targetId, sourceId]);
      if (!created && source.groupId) {
        moveWindowToGroup(sourceId, source.groupId);
      }
    },
    [activeWorkspace.windows, createGroup, groups.length, moveWindowToGroup],
  );

  const handleCloseWindow = useCallback(
    (windowId: string) => {
      closeWindow(windowId);
      setDraggingWindow((current) => (current === windowId ? null : current));
    },
    [closeWindow],
  );

  const handleGroupDrop = useCallback(
    (groupId: GroupId, index: number) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (event.dataTransfer.types.includes(WINDOW_DRAG_TYPE)) {
        const windowId = event.dataTransfer.getData(WINDOW_DRAG_TYPE);
        if (windowId) {
          moveWindowToGroup(windowId, groupId);
        }
        setDraggingWindow(null);
        return;
      }
      if (event.dataTransfer.types.includes(GROUP_DRAG_TYPE)) {
        const draggedId = event.dataTransfer.getData(GROUP_DRAG_TYPE);
        if (draggedId && draggedId !== groupId) {
          moveGroup(draggedId, index);
        }
      }
    },
    [moveGroup, moveWindowToGroup],
  );

  const handleGroupDragStart = useCallback(
    (groupId: GroupId) => (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData(GROUP_DRAG_TYPE, groupId);
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const handleUngroupDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer.types.includes(WINDOW_DRAG_TYPE)) return;
      event.preventDefault();
      const windowId = event.dataTransfer.getData(WINDOW_DRAG_TYPE);
      if (windowId) {
        moveWindowToGroup(windowId, null);
      }
      setDraggingWindow(null);
    },
    [moveWindowToGroup],
  );

  const handleCreateGroup = useCallback(() => {
    if (typeof window === 'undefined') return;
    const name = window.prompt('Name for the new group', `Group ${groups.length + 1}`);
    if (name === null) return;
    createGroup(name);
  }, [createGroup, groups.length]);

  const handleDropNewGroup = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer.types.includes(WINDOW_DRAG_TYPE)) return;
      event.preventDefault();
      const windowId = event.dataTransfer.getData(WINDOW_DRAG_TYPE);
      if (!windowId) return;
      const windowTitle = activeWorkspace.windows[windowId]?.title ?? 'New';
      let proposed = `Group ${groups.length + 1}`;
      if (windowTitle) {
        proposed = formatGroupName(windowTitle, groups.length + 1);
      }
      let name = proposed;
      if (typeof window !== 'undefined') {
        const response = window.prompt('Name for the new group', proposed);
        if (response === null) {
          setDraggingWindow(null);
          return;
        }
        name = response.trim() || proposed;
      }
      createGroup(name, [windowId]);
      setDraggingWindow(null);
    },
    [activeWorkspace.windows, createGroup, groups.length],
  );

  const handleRenameGroup = useCallback(
    (groupId: GroupId, currentName: string) => {
      if (typeof window === 'undefined') return;
      const response = window.prompt('Rename group', currentName);
      if (response === null) return;
      const trimmed = response.trim();
      if (trimmed) {
        renameGroup(groupId, trimmed);
      }
    },
    [renameGroup],
  );

  const handleDissolveGroup = useCallback(
    (groupId: GroupId) => {
      if (typeof window !== 'undefined') {
        const confirmed = window.confirm('Remove this group? Windows will remain open.');
        if (!confirmed) return;
      }
      dissolveGroup(groupId);
    },
    [dissolveGroup],
  );

  return (
    <section className="flex h-full flex-col gap-3 bg-gradient-to-b from-black/60 via-gray-900 to-black/60 p-4 text-gray-100">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Window Groups</h2>
          <div className="flex items-center gap-2">
            <div
              onDrop={handleUngroupDrop}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes(WINDOW_DRAG_TYPE)) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                }
              }}
              className={`rounded border border-dashed border-gray-600 px-3 py-1 text-sm transition ${
                draggingWindow ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-300'
              }`}
              role="button"
              aria-label="Ungroup window"
            >
              Drop to ungroup
            </div>
            <button
              type="button"
              onClick={handleCreateGroup}
              className="rounded bg-ub-orange px-3 py-1 text-sm font-medium text-black transition hover:bg-ub-orange/80"
            >
              New Group
            </button>
          </div>
        </div>
        <div
          className="flex gap-3 overflow-x-auto"
          role="list"
          aria-label="Window groups"
        >
          {groups.map(({ group, members }, index) => (
            <GroupChip
              key={group.id}
              id={group.id}
              name={group.name}
              members={members}
              onDrop={handleGroupDrop}
              onDragStart={handleGroupDragStart}
              onRename={handleRenameGroup}
              onDissolve={handleDissolveGroup}
              index={index}
            />
          ))}
          <div
            onDrop={handleDropNewGroup}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes(WINDOW_DRAG_TYPE)) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }
            }}
            className={`flex min-w-[9rem] cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed border-gray-600 p-4 text-sm text-gray-300 transition ${
              draggingWindow ? 'bg-gray-800 text-white' : 'bg-gray-900'
            }`}
            role="button"
            aria-label="Create group from dropped window"
          >
            <span className="text-lg">＋</span>
            <span>Drop here for new group</span>
          </div>
        </div>
      </header>
      <main className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
        {windows.map((win) => (
          <DesktopWindowCard
            key={win.id}
            window={win}
            onDragStart={onWindowDragStart}
            onDragEnd={() => setDraggingWindow(null)}
            onDrop={onWindowDrop}
            onClose={handleCloseWindow}
            onFocus={focusWindow}
          />
        ))}
        {windows.length === 0 && (
          <p className="text-sm text-gray-400" role="status">
            No windows are open in this workspace.
          </p>
        )}
      </main>
      <HelpPanel appId="desktop-window-groups" docPath="/docs/desktop-window-groups.md" />
    </section>
  );
};

export default DesktopWindows;
