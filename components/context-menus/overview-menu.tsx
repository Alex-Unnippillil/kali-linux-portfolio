import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';

export type WorkspaceOption = {
  id: string;
  name: string;
};

interface OverviewMenuProps {
  active: boolean;
  anchorPoint: { x: number; y: number };
  minimized: boolean;
  workspaces: WorkspaceOption[];
  currentWorkspace?: string;
  onCloseMenu?: () => void;
  onClose?: () => void;
  onToggleMinimize?: () => void;
  onMoveToWorkspace?: (workspaceId: string) => void;
}

const OverviewMenu = forwardRef<HTMLDivElement, OverviewMenuProps>(
  (
    {
      active,
      anchorPoint = { x: 0, y: 0 },
      minimized,
      workspaces,
      currentWorkspace,
      onCloseMenu,
      onClose,
      onToggleMinimize,
      onMoveToWorkspace,
    },
    ref,
  ) => {
    const localRef = useRef<HTMLDivElement | null>(null);

    useImperativeHandle(ref, () => localRef.current, []);

    useFocusTrap(localRef, active);
    useRovingTabIndex(localRef, active, 'vertical');

    useEffect(() => {
      if (!active) return;
      const firstButton = localRef.current?.querySelector<
        HTMLButtonElement
      >('button');
      firstButton?.focus();
    }, [active]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseMenu?.();
      }
    };

    const handleToggleMinimize = () => {
      onToggleMinimize?.();
      onCloseMenu?.();
    };

    const handleClose = () => {
      onClose?.();
      onCloseMenu?.();
    };

    const handleMove = (workspaceId: string) => {
      onMoveToWorkspace?.(workspaceId);
      onCloseMenu?.();
    };

    const minimizeLabel = minimized ? 'Restore Window' : 'Minimize Window';

    return (
      <div
        id="overview-menu"
        role="menu"
        aria-hidden={!active}
        ref={localRef}
        onKeyDown={handleKeyDown}
        className={`${
          active ? 'block' : 'hidden'
        } cursor-default w-60 context-menu-bg border border-gray-900 rounded text-white py-3 absolute z-50 text-sm shadow-lg`}
        style={{ top: `${anchorPoint.y}px`, left: `${anchorPoint.x}px` }}
      >
        <button
          type="button"
          onClick={handleToggleMinimize}
          role="menuitem"
          aria-label={minimizeLabel}
          className="w-full text-left px-4 py-1.5 hover:bg-ub-warm-grey hover:bg-opacity-20"
        >
          <span className="flex items-center justify-between">
            <span>{minimizeLabel}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={handleClose}
          role="menuitem"
          aria-label="Close Window"
          className="w-full text-left px-4 py-1.5 hover:bg-ub-warm-grey hover:bg-opacity-20"
        >
          <span className="flex items-center justify-between">
            <span>Close Window</span>
          </span>
        </button>
        <div
          role="none"
          className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-gray-300"
        >
          Move to workspace
        </div>
        <div role="none" className="flex flex-col">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => handleMove(workspace.id)}
              role="menuitem"
              aria-label={`Move to ${workspace.name}`}
              className="w-full text-left px-4 py-1.5 hover:bg-ub-warm-grey hover:bg-opacity-20 flex items-center justify-between"
            >
              <span>{workspace.name}</span>
              {currentWorkspace === workspace.id && (
                <span aria-hidden="true" className="text-ubt-grey">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  },
);

OverviewMenu.displayName = 'OverviewMenu';

export default OverviewMenu;
