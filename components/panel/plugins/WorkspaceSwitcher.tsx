import React, { useCallback, useState } from 'react';

interface WindowPreview {
  id: string;
  title: string;
}

interface Workspace {
  id: string;
  name: string;
  windows: WindowPreview[];
}

const createDefaultWorkspaces = (): Workspace[] =>
  Array.from({ length: 4 }, (_, i) => ({
    id: String(i + 1),
    name: `Workspace ${i + 1}`,
    windows: [
      {
        id: `w${i + 1}`,
        title: `Window ${i + 1}`,
      },
    ],
  }));

const WorkspaceSwitcher: React.FC = () => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(
    createDefaultWorkspaces,
  );
  const [activeId, setActiveId] = useState(workspaces[0].id);

  const handleWindowDragStart = useCallback(
    (e: React.DragEvent, workspaceId: string, windowId: string) => {
      e.dataTransfer.setData('windowId', windowId);
      e.dataTransfer.setData('fromWorkspaceId', workspaceId);
    },
    [],
  );

  const handleWorkspaceDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const windowId = e.dataTransfer.getData('windowId');
      const fromId = e.dataTransfer.getData('fromWorkspaceId');
      if (windowId && fromId && fromId !== targetId) {
        setWorkspaces((prev) => {
          const next = prev.map((ws) => ({ ...ws, windows: [...ws.windows] }));
          const fromWs = next.find((ws) => ws.id === fromId);
          const targetWs = next.find((ws) => ws.id === targetId);
          if (fromWs && targetWs) {
            const idx = fromWs.windows.findIndex((w) => w.id === windowId);
            if (idx >= 0) {
              const [win] = fromWs.windows.splice(idx, 1);
              targetWs.windows.push(win);
            }
          }
          return next;
        });
      }
    },
    [],
  );

  const handleWorkspaceClick = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const renameWorkspace = useCallback(
    (idx: number) => {
      const newName = window.prompt('Workspace name', workspaces[idx].name);
      if (newName && newName.trim()) {
        setWorkspaces((prev) => {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], name: newName.trim() };
          return copy;
        });
      }
    },
    [workspaces],
  );

  const handleWsDragStart = useCallback((e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('wsIndex', idx.toString());
  }, []);

  const handleWsDrop = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const fromIdx = Number(e.dataTransfer.getData('wsIndex'));
    if (!Number.isNaN(fromIdx) && fromIdx !== idx) {
      setWorkspaces((prev) => {
        const copy = [...prev];
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(idx, 0, moved);
        return copy;
      });
    }
  }, []);

  return (
    <div className="flex space-x-2">
      {workspaces.map((ws, idx) => (
        <div
          key={ws.id}
          className={`p-1 border rounded cursor-pointer ${
            activeId === ws.id ? 'border-blue-500' : 'border-transparent'
          }`}
          onClick={() => handleWorkspaceClick(ws.id)}
          draggable
          onDragStart={(e) => handleWsDragStart(e, idx)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleWsDrop(e, idx)}
        >
          <div
            className="text-xs text-center mb-1"
            onDoubleClick={() => renameWorkspace(idx)}
          >
            {ws.name}
          </div>
          <div
            className="w-20 h-20 bg-gray-800 grid grid-cols-2 gap-1 p-1"
            onDrop={(e) => handleWorkspaceDrop(e, ws.id)}
            onDragOver={(e) => e.preventDefault()}
          >
            {ws.windows.map((win) => (
              <div
                key={win.id}
                draggable
                onDragStart={(e) =>
                  handleWindowDragStart(e, ws.id, win.id)
                }
                className="bg-gray-600"
                title={win.title}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkspaceSwitcher;

