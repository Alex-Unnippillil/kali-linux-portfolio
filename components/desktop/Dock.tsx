'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import SideBarApp from '../base/side_bar_app';

type DockApp = {
  id: string;
  title: string;
  icon: string;
};

type DockStateMap = Record<string, boolean | undefined>;

type DockProps = {
  apps: DockApp[];
  hide: boolean;
  hideSideBar: (id: string | null, hide: boolean) => void;
  favourite_apps: DockStateMap;
  showAllApps: () => void;
  allAppsView: boolean;
  closed_windows: DockStateMap;
  focused_windows: DockStateMap;
  isMinimized: DockStateMap;
  openAppByAppId: (id: string) => void;
  pinnedApps?: DockStateMap;
};

const Dock = ({
  apps,
  hide,
  hideSideBar,
  favourite_apps,
  showAllApps,
  closed_windows,
  focused_windows,
  isMinimized,
  openAppByAppId,
  pinnedApps = {},
}: DockProps) => {
  const hideTimer = useRef<number | null>(null);

  const showDock = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    hideSideBar(null, false);
  }, [hideSideBar]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = window.setTimeout(() => {
      hideSideBar(null, true);
      hideTimer.current = null;
    }, 2000);
  }, [hideSideBar]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const dockItems = useMemo(() => {
    return apps.reduce<JSX.Element[]>((items, app) => {
      if (!favourite_apps?.[app.id]) {
        return items;
      }

      const isPinned = Boolean(pinnedApps?.[app.id]);
      const isRunning = closed_windows?.[app.id] === false;
      const ariaPressed: 'true' | 'false' | 'mixed' = isPinned
        ? 'true'
        : isRunning
        ? 'mixed'
        : 'false';

      items.push(
        <SideBarApp
          key={app.id}
          id={app.id}
          title={app.title}
          icon={app.icon}
          isClose={closed_windows}
          isFocus={focused_windows}
          openApp={openAppByAppId}
          isMinimized={isMinimized}
          ariaPressed={ariaPressed}
        />
      );

      return items;
    }, []);
  }, [apps, favourite_apps, pinnedApps, closed_windows, focused_windows, isMinimized, openAppByAppId]);

  return (
    <>
      <nav
        role="toolbar"
        aria-label="Dock"
        className={`${hide ? ' -translate-x-full ' : ''} absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen w-16 flex flex-col justify-start items-center pt-7 border-black border-opacity-60 bg-black bg-opacity-50`}
      >
        {dockItems}
        <AllApps showApps={showAllApps} />
      </nav>
      <div
        onMouseEnter={showDock}
        onMouseLeave={scheduleHide}
        className="w-1 h-full absolute top-0 left-0 bg-transparent z-50"
      />
    </>
  );
};

type AllAppsProps = {
  showApps: () => void;
};

export const AllApps = ({ showApps }: AllAppsProps) => {
  const [title, setTitle] = useState(false);

  return (
    <div
      className="w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active"
      style={{ marginTop: 'auto' }}
      onMouseEnter={() => setTitle(true)}
      onMouseLeave={() => setTitle(false)}
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
          className={`${title ? ' visible ' : ' invisible '} w-max py-0.5 px-1.5 absolute top-1 left-full ml-5 text-ubt-grey text-opacity-90 text-sm bg-ub-grey bg-opacity-70 border-gray-400 border border-opacity-40 rounded-md`}
        >
          Show Applications
        </div>
      </div>
    </div>
  );
};

export default Dock;

