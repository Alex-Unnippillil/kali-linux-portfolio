import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import SideBarApp from '../base/side_bar_app';

interface DesktopAppMeta {
  id: string;
  title: string;
  icon: string;
  [key: string]: unknown;
}

type WindowStateMap = Record<string, boolean | undefined>;

type HideSideBar = (id: string | null, hide: boolean) => void;

type OpenApp = (id: string) => void;

interface DockProps {
  apps: DesktopAppMeta[];
  hide: boolean;
  hideSideBar: HideSideBar;
  favourite_apps: WindowStateMap;
  showAllApps: () => void;
  closed_windows: WindowStateMap;
  focused_windows: WindowStateMap;
  isMinimized: WindowStateMap;
  openAppByAppId: OpenApp;
  openFromMinimised?: OpenApp;
}

const HIDE_DELAY_MS = 2000;

const DockComponent: React.FC<DockProps> = ({
  apps,
  hide,
  hideSideBar,
  favourite_apps,
  showAllApps,
  closed_windows,
  focused_windows,
  isMinimized,
  openAppByAppId,
}) => {
  const hideTimer = useRef<number | null>(null);

  const pinnedApps = useMemo(
    () => apps.filter((app) => favourite_apps[app.id]),
    [apps, favourite_apps],
  );

  useEffect(() => () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
    }
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const handleShowDock = useCallback(() => {
    cancelHide();
    hideSideBar(null, false);
  }, [cancelHide, hideSideBar]);

  const handleHideDock = useCallback(() => {
    cancelHide();
    hideTimer.current = window.setTimeout(() => {
      hideSideBar(null, true);
    }, HIDE_DELAY_MS);
  }, [cancelHide, hideSideBar]);

  const favouriteItems = useMemo(
    () =>
      pinnedApps.map((app) => (
        <SideBarApp
          key={app.id}
          id={app.id}
          title={app.title}
          icon={app.icon}
          isClose={closed_windows}
          isFocus={focused_windows}
          openApp={openAppByAppId}
          isMinimized={isMinimized}
        />
      )),
    [pinnedApps, closed_windows, focused_windows, isMinimized, openAppByAppId],
  );

  return (
    <>
      <nav
        aria-label="Dock"
        onMouseEnter={handleShowDock}
        onMouseLeave={handleHideDock}
        className={`${hide ? ' -translate-x-full ' : ''} absolute transform duration-300 select-none z-40 left-0 top-0 h-full min-h-screen w-16 flex flex-col justify-start items-center pt-7 border-black border-opacity-60 bg-black bg-opacity-50`}
      >
        {favouriteItems}
        <AllApps showApps={showAllApps} />
      </nav>
      <div
        onMouseEnter={handleShowDock}
        onMouseLeave={handleHideDock}
        className="w-1 h-full absolute top-0 left-0 bg-transparent z-50"
      />
    </>
  );
};

interface AllAppsProps {
  showApps: () => void;
}

const AllApps: React.FC<AllAppsProps> = React.memo(({ showApps }) => {
  const [titleVisible, setTitleVisible] = useState(false);

  const handleEnter = useCallback(() => setTitleVisible(true), []);
  const handleLeave = useCallback(() => setTitleVisible(false), []);

  return (
    <div
      className="w-10 h-10 rounded m-1 hover:bg-white hover:bg-opacity-10 flex items-center justify-center transition-hover transition-active"
      style={{ marginTop: 'auto' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
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
});

AllApps.displayName = 'Dock.AllApps';

const Dock = React.memo(DockComponent);

Dock.displayName = 'Dock';

export default Dock;
