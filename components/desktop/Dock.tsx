'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import SideBarApp from '../base/side_bar_app';

type DockApp = {
  id: string;
  title: string;
  icon: string;
  [key: string]: unknown;
};

type DockProps = {
  apps: DockApp[];
  order: string[];
  hide: boolean;
  hideSideBar: (id: string | null, hide: boolean) => void;
  favourite_apps: Record<string, boolean>;
  showAllApps: () => void;
  closed_windows: Record<string, boolean>;
  focused_windows: Record<string, boolean>;
  isMinimized: Record<string, boolean>;
  openAppByAppId: (id: string) => void;
  onOrderChange: (nextOrder: string[]) => void;
};

type MovePreview = {
  id: string;
  index: number;
} | null;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const Dock = ({
  apps,
  order,
  hide,
  hideSideBar,
  favourite_apps,
  showAllApps,
  closed_windows,
  focused_windows,
  isMinimized,
  openAppByAppId,
  onOrderChange,
}: DockProps) => {
  const pinnedIds = useMemo(
    () =>
      Object.keys(favourite_apps).filter((id) => favourite_apps[id]),
    [favourite_apps],
  );

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const appMap = useMemo(() => {
    const map = new Map<string, DockApp>();
    apps.forEach((app) => {
      if (pinnedSet.has(app.id)) {
        map.set(app.id, app);
      }
    });
    return map;
  }, [apps, pinnedSet]);

  const orderedApps = useMemo(() => {
    const seen = new Set<string>();
    const result: DockApp[] = [];

    order.forEach((id) => {
      const app = appMap.get(id);
      if (app) {
        result.push(app);
        seen.add(id);
      }
    });

    apps.forEach((app) => {
      if (pinnedSet.has(app.id) && !seen.has(app.id)) {
        result.push(app);
      }
    });

    return result;
  }, [appMap, apps, order, pinnedSet]);

  const [movePreview, setMovePreview] = useState<MovePreview>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const previewTimeout = useRef<number | null>(null);
  const orderRef = useRef<string[]>(order);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(
    () => () => {
      if (previewTimeout.current !== null) {
        window.clearTimeout(previewTimeout.current);
      }
    },
    [],
  );

  const handleMovePreview = useCallback((next: MovePreview) => {
    setMovePreview(next);
    if (previewTimeout.current !== null) {
      window.clearTimeout(previewTimeout.current);
      previewTimeout.current = null;
    }
    if (next) {
      previewTimeout.current = window.setTimeout(() => {
        setMovePreview(null);
        previewTimeout.current = null;
      }, 1500);
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, app: DockApp) => {
      if (!event.altKey) return;

      const direction =
        event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? 1
            : 0;

      if (direction === 0) return;

      event.preventDefault();
      event.stopPropagation();

      const currentOrder = orderRef.current;
      const currentIndex = currentOrder.indexOf(app.id);
      if (currentIndex === -1) return;

      const targetIndex = clamp(
        currentIndex + direction,
        0,
        Math.max(currentOrder.length - 1, 0),
      );

      if (targetIndex === currentIndex) return;

      const nextOrder = [...currentOrder];
      nextOrder.splice(currentIndex, 1);
      nextOrder.splice(targetIndex, 0, app.id);

      orderRef.current = nextOrder;
      onOrderChange(nextOrder);
      handleMovePreview({ id: app.id, index: targetIndex });
      setLiveMessage(
        `${app.title} moved to position ${targetIndex + 1} of ${nextOrder.length}`,
      );
    },
    [handleMovePreview, onOrderChange],
  );

  const showDock = useCallback(() => {
    hideSideBar(null, false);
  }, [hideSideBar]);

  const hideDock = useCallback(() => {
    window.setTimeout(() => {
      hideSideBar(null, true);
    }, 2000);
  }, [hideSideBar]);

  return (
    <>
      <nav
        aria-label="Dock"
        className={`${hide ? '-translate-x-full ' : ''}absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen w-16 flex flex-col justify-start items-center pt-7 border-black border-opacity-60 bg-black bg-opacity-50`}
      >
        <div aria-live="polite" className="sr-only" role="status">
          {liveMessage}
        </div>
        {orderedApps.map((app) => (
          <div key={app.id} className="relative flex w-full justify-center">
            <SideBarApp
              id={app.id}
              title={app.title}
              icon={app.icon}
              isClose={closed_windows}
              isFocus={focused_windows}
              openApp={openAppByAppId}
              isMinimized={isMinimized}
              onKeyDown={(event) => handleKeyDown(event, app)}
            />
            {movePreview?.id === app.id && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-full rounded-full bg-ub-grey bg-opacity-80 px-1.5 py-0.5 text-xs text-white shadow-lg"
              >
                {movePreview.index + 1}
              </span>
            )}
          </div>
        ))}
        <AllApps showApps={showAllApps} />
      </nav>
      <div
        className="absolute top-0 left-0 h-full w-1 bg-transparent z-50"
        onMouseEnter={showDock}
        onMouseLeave={hideDock}
      />
    </>
  );
};

const AllApps = ({ showApps }: { showApps: () => void }) => {
  const [titleVisible, setTitleVisible] = useState(false);

  return (
    <div
      className="w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active"
      style={{ marginTop: 'auto' }}
      onMouseEnter={() => setTitleVisible(true)}
      onMouseLeave={() => setTitleVisible(false)}
      onClick={showApps}
    >
      <div className="relative">
        <Image
          width={28}
          height={28}
          className="w-7"
          src="/themes/Yaru/system/view-app-grid-symbolic.svg"
          alt="Ubuntu view app"
          sizes="28px"
        />
        <div
          className={`${titleVisible ? ' visible ' : ' invisible '} w-max py-0.5 px-1.5 absolute top-1 left-full ml-5 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md`}
        >
          Show Applications
        </div>
      </div>
    </div>
  );
};

export default Dock;
