import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import BackgroundImage from '../util components/background-image';
import SideBar from './side_bar';
import apps from '../../apps.config';
import Window from '../base/window';
import UbuntuApp from '../base/ubuntu_app';
import AllApplications from '../screen/all-applications';
import DesktopMenu from '../context menus/desktop-menu';
import DefaultMenu from '../context menus/default';
import ReactGA from 'react-ga4';

export const Desktop = forwardRef((props, ref) => {
  const appStack = useRef([]);
  const initFavourite = useRef({});
  const windowRefs = useRef({});
  const sidebarRefs = useRef({});
  const desktopMenuRef = useRef(null);
  const defaultMenuRef = useRef(null);
  const folderInputRef = useRef(null);

  const [focusedWindows, setFocusedWindows] = useState({});
  const [closedWindows, setClosedWindows] = useState({});
  const [allAppsView, setAllAppsView] = useState(false);
  const [overlappedWindows, setOverlappedWindows] = useState({});
  const [disabledApps, setDisabledApps] = useState({});
  const [favouriteApps, setFavouriteApps] = useState({});
  const [hideSideBar, setHideSideBar] = useState(false);
  const [minimizedWindows, setMinimizedWindows] = useState({});
  const [desktopApps, setDesktopApps] = useState([]);
  const [contextMenus, setContextMenus] = useState({ desktop: false, default: false });
  const [showNameBar, setShowNameBar] = useState(false);

  useImperativeHandle(ref, () => ({
    openApp
  }));

  useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: "/desktop", title: "Custom Title" });
    fetchAppsData();
    checkForNewFolders();
    document.addEventListener('contextmenu', checkContextMenu);
    document.addEventListener('click', hideAllContextMenu);
    return () => {
      document.removeEventListener('contextmenu', checkContextMenu);
      document.removeEventListener('click', hideAllContextMenu);
    };
  }, []);

  const checkForNewFolders = () => {
    var new_folders = localStorage.getItem('new_folders');
    if (new_folders === null && new_folders !== undefined) {
      localStorage.setItem("new_folders", JSON.stringify([]));
    }
    else {
      new_folders = JSON.parse(new_folders);
      new_folders.forEach(folder => {
        apps.push({
          id: `new-folder-${folder.id}`,
          title: folder.name,
          icon: './themes/Yaru/system/folder.png',
          disabled: true,
          favourite: false,
          desktop_shortcut: true,
          screen: () => { },
        });
      });
      updateAppsData();
    }
  };

  const checkContextMenu = (e) => {
    e.preventDefault();
    hideAllContextMenu();
    switch (e.target.dataset.context) {
      case "desktop-area":
        ReactGA.event({
          category: `Context Menu`,
          action: `Opened Desktop Context Menu`
        });
        showContextMenu(e, "desktop");
        break;
      default:
        ReactGA.event({
          category: `Context Menu`,
          action: `Opened Default Context Menu`
        });
        showContextMenu(e, "default");
    }
  };

  const showContextMenu = (e, menuName) => {
    let { posx, posy } = getMenuPosition(e);
    let contextMenu = menuName === "desktop" ? desktopMenuRef.current : defaultMenuRef.current;

    if (!contextMenu) return;

    const { offsetWidth, offsetHeight } = contextMenu;
    if (posx + offsetWidth > window.innerWidth) posx -= offsetWidth;
    if (posy + offsetHeight > window.innerHeight) posy -= offsetHeight;

    contextMenu.style.left = posx.toString() + "px";
    contextMenu.style.top = posy.toString() + "px";

    setContextMenus(prev => ({ ...prev, [menuName]: true }));
  };

  const hideAllContextMenu = () => {
    setContextMenus(prev => {
      const menus = { ...prev };
      Object.keys(menus).forEach(key => {
        menus[key] = false;
      });
      return menus;
    });
  };

  const getMenuPosition = (e) => {
    var posx = 0;
    var posy = 0;

    if (!e) e = window.event;

    if (e.pageX || e.pageY) {
      posx = e.pageX;
      posy = e.pageY;
    } else if (e.clientX || e.clientY) {
      posx = e.clientX + document.body.scrollLeft +
        document.documentElement.scrollLeft;
      posy = e.clientY + document.body.scrollTop +
        document.documentElement.scrollTop;
    }
    return {
      posx, posy
    }
  };

  const fetchAppsData = () => {
    let focused_windows = {}, closed_windows = {}, disabled_apps = {}, favourite_apps = {}, overlapped_windows = {}, minimized_windows = {};
    let desktop_apps = [];
    apps.forEach((app) => {
      focused_windows = {
        ...focused_windows,
        [app.id]: false,
      };
      closed_windows = {
        ...closed_windows,
        [app.id]: true,
      };
      disabled_apps = {
        ...disabled_apps,
        [app.id]: app.disabled,
      };
      favourite_apps = {
        ...favourite_apps,
        [app.id]: app.favourite,
      };
      overlapped_windows = {
        ...overlapped_windows,
        [app.id]: false,
      };
      minimized_windows = {
        ...minimized_windows,
        [app.id]: false,
      }
      if (app.desktop_shortcut) desktop_apps.push(app.id);
    });
    setFocusedWindows(focused_windows);
    setClosedWindows(closed_windows);
    setDisabledApps(disabled_apps);
    setFavouriteApps(favourite_apps);
    setOverlappedWindows(overlapped_windows);
    setMinimizedWindows(minimized_windows);
    setDesktopApps(desktop_apps);
    initFavourite.current = { ...favourite_apps };
  };

  const updateAppsData = () => {
    let focused_windows = {}, closed_windows = {}, favourite_apps = {}, minimized_windows = {}, disabled_apps = {};
    let desktop_apps = [];
    apps.forEach((app) => {
      focused_windows = {
        ...focused_windows,
        [app.id]: ((focusedWindows[app.id] !== undefined || focusedWindows[app.id] !== null) ? focusedWindows[app.id] : false),
      };
      minimized_windows = {
        ...minimized_windows,
        [app.id]: ((minimizedWindows[app.id] !== undefined || minimizedWindows[app.id] !== null) ? minimizedWindows[app.id] : false)
      };
      disabled_apps = {
        ...disabled_apps,
        [app.id]: app.disabled
      };
      closed_windows = {
        ...closed_windows,
        [app.id]: ((closedWindows[app.id] !== undefined || closedWindows[app.id] !== null) ? closedWindows[app.id] : true)
      };
      favourite_apps = {
        ...favourite_apps,
        [app.id]: app.favourite
      }
      if (app.desktop_shortcut) desktop_apps.push(app.id);
    });
    setFocusedWindows(focused_windows);
    setClosedWindows(closed_windows);
    setDisabledApps(disabled_apps);
    setMinimizedWindows(minimized_windows);
    setFavouriteApps(favourite_apps);
    setDesktopApps(desktop_apps);
    initFavourite.current = { ...favourite_apps };
  };

  const renderDesktopApps = () => {
    if (Object.keys(closedWindows).length === 0) return;
    let appsJsx = [];
    apps.forEach((app, index) => {
      if (desktopApps.includes(app.id)) {

        const propsApp = {
          name: app.title,
          id: app.id,
          icon: app.icon,
          openApp: openApp
        }

        appsJsx.push(
          <UbuntuApp key={index} {...propsApp} />
        );
      }
    });
    return appsJsx;
  };

  const renderWindows = () => {
    let windowsJsx = [];
    apps.forEach((app, index) => {
      if (closedWindows[app.id] === false) {

        const propsWindow = {
          title: app.title,
          id: app.id,
          screen: app.screen,
          addFolder: addToDesktop,
          closed: closeApp,
          openApp: openApp,
          focus: focus,
          isFocused: focusedWindows[app.id],
          hideSideBar: hideSideBarFn,
          hasMinimised: hasMinimised,
          minimized: minimizedWindows[app.id],
          changeBackgroundImage: props.changeBackgroundImage,
          bg_image_name: props.bg_image_name,
          sidebarRefs: sidebarRefs
        }

        windowsJsx.push(
          <Window key={index} ref={el => windowRefs.current[app.id] = el} {...propsWindow} />
        )
      }
    });
    return windowsJsx;
  };

  const hideSideBarFn = (objId, hide) => {
    if (hide === hideSideBar) return;

    if (objId === null) {
      if (hide === false) {
        setHideSideBar(false);
      }
      else {
        for (const key in overlappedWindows) {
          if (overlappedWindows[key]) {
            setHideSideBar(true);
            return;
          }
        }
      }
      return;
    }

    if (hide === false) {
      for (const key in overlappedWindows) {
        if (overlappedWindows[key] && key !== objId) return;
      }
    }

    setOverlappedWindows(prev => {
      const ow = { ...prev, [objId]: hide };
      return ow;
    });
    setHideSideBar(hide);
  };

  const hasMinimised = (objId) => {
    setMinimizedWindows(prev => ({ ...prev, [objId]: true }));
    setFocusedWindows(prev => ({ ...prev, [objId]: false }));
    hideSideBarFn(null, false);
    giveFocusToLastApp();
  };

  const giveFocusToLastApp = () => {
    if (!checkAllMinimised()) {
      for (const index in appStack.current) {
        if (!minimizedWindows[appStack.current[index]]) {
          focus(appStack.current[index]);
          break;
        }
      }
    }
  };

  const checkAllMinimised = () => {
    let result = true;
    for (const key in minimizedWindows) {
      if (!closedWindows[key]) {
        result = result & minimizedWindows[key];
      }
    }
    return result;
  };

  const openApp = (objId) => {

    ReactGA.event({
      category: `Open App`,
      action: `Opened ${objId} window`
    });

    if (disabledApps[objId]) return;

    if (minimizedWindows[objId]) {
      focus(objId);

      var r = windowRefs.current[objId];
      r.style.transform = `translate(${r.style.getPropertyValue("--window-transform-x")},${r.style.getPropertyValue("--window-transform-y")}) scale(1)`;

      setMinimizedWindows(prev => ({ ...prev, [objId]: false }));
      return;
    }

    if (appStack.current.includes(objId)) focus(objId);
    else {
      let closed_windows = { ...closedWindows };
      let favourite_apps = { ...favouriteApps };
      var frequentApps = localStorage.getItem('frequentApps') ? JSON.parse(localStorage.getItem('frequentApps')) : [];
      var currentApp = frequentApps.find(app => app.id === objId);
      if (currentApp) {
        frequentApps.forEach((app) => {
          if (app.id === currentApp.id) {
            app.frequency += 1;
          }
        });
      } else {
        frequentApps.push({ id: objId, frequency: 1 });
      }

      frequentApps.sort((a, b) => {
        if (a.frequency < b.frequency) {
          return 1;
        }
        if (a.frequency > b.frequency) {
          return -1;
        }
        return 0;
      });

      localStorage.setItem("frequentApps", JSON.stringify(frequentApps));

      setTimeout(() => {
        favourite_apps[objId] = true;
        closed_windows[objId] = false;
        setClosedWindows(closed_windows);
        setFavouriteApps(favourite_apps);
        setAllAppsView(false);
        focus(objId);
        appStack.current.push(objId);
      }, 200);
    }
  };

  const closeApp = (objId) => {

    appStack.current.splice(appStack.current.indexOf(objId), 1);

    giveFocusToLastApp();

    hideSideBarFn(null, false);

    let closed_windows = { ...closedWindows };
    let favourite_apps = { ...favouriteApps };

    if (initFavourite.current[objId] === false) favourite_apps[objId] = false;
    closed_windows[objId] = true;

    setClosedWindows(closed_windows);
    setFavouriteApps(favourite_apps);
  };

  const focus = (objId) => {
    setFocusedWindows(prev => {
      const newFocus = { ...prev };
      Object.keys(newFocus).forEach(key => {
        newFocus[key] = key === objId;
      });
      return newFocus;
    });
  };

  const addNewFolder = () => {
    setShowNameBar(true);
  };

  const addToDesktop = (folder_name) => {
    folder_name = folder_name.trim();
    let folder_id = folder_name.replace(/\s+/g, '-').toLowerCase();
    apps.push({
      id: `new-folder-${folder_id}`,
      title: folder_name,
      icon: './themes/Yaru/system/folder.png',
      disabled: true,
      favourite: false,
      desktop_shortcut: true,
      screen: () => { },
    });
    var new_folders = JSON.parse(localStorage.getItem('new_folders'));
    new_folders.push({ id: `new-folder-${folder_id}`, name: folder_name });
    localStorage.setItem("new_folders", JSON.stringify(new_folders));

    setShowNameBar(false);
    updateAppsData();
  };

  const showAllApps = () => { setAllAppsView(!allAppsView) }

  const renderNameBar = () => {
    let addFolder = () => {
      let folder_name = folderInputRef.current.value;
      addToDesktop(folder_name);
    }

    let removeCard = () => {
      setShowNameBar(false);
    }

    return (
      <div className="absolute rounded-md top-1/2 left-1/2 text-center text-white font-light text-sm bg-ub-cool-grey transform -translate-y-1/2 -translate-x-1/2 sm:w-96 w-3/4 z-50">
        <div className="w-full flex flex-col justify-around items-start pl-6 pb-8 pt-6">
          <span>New folder name</span>
          <input className="outline-none mt-5 px-1 w-10/12  context-menu-bg border-2 border-blue-700 rounded py-0.5" ref={folderInputRef} type="text" autoComplete="off" spellCheck="false" autoFocus={true} />
        </div>
        <div className="flex">
          <div onClick={addFolder} className="w-1/2 px-4 py-2 border border-gray-900 border-opacity-50 border-r-0 hover:bg-ub-warm-grey hover:bg-opacity-10 hover:border-opacity-50">Create</div>
          <div onClick={removeCard} className="w-1/2 px-4 py-2 border border-gray-900 border-opacity-50 hover:bg-ub-warm-grey hover:bg-opacity-10 hover:border-opacity-50">Cancel</div>
        </div>
      </div>
    );
  };

  return (
    <div className={" h-full w-full flex flex-col items-end justify-start content-start flex-wrap-reverse pt-8 bg-transparent relative overflow-hidden overscroll-none window-parent"}>

      <div className="absolute h-full w-full bg-transparent" data-context="desktop-area">
        {renderWindows()}
      </div>

      <BackgroundImage img={props.bg_image_name} />

      <SideBar apps={apps}
        hide={hideSideBar}
        hideSideBar={hideSideBarFn}
        favourite_apps={favouriteApps}
        showAllApps={showAllApps}
        allAppsView={allAppsView}
        closed_windows={closedWindows}
        focused_windows={focusedWindows}
        isMinimized={minimizedWindows}
        openAppByAppId={openApp}
        sidebarRefs={sidebarRefs}
      />

      {renderDesktopApps()}

      <DesktopMenu ref={desktopMenuRef} active={contextMenus.desktop} openApp={openApp} addNewFolder={addNewFolder} />
      <DefaultMenu ref={defaultMenuRef} active={contextMenus.default} />

      {
        (showNameBar
          ? renderNameBar()
          : null
        )
      }

      {allAppsView ?
        <AllApplications apps={apps}
          recentApps={appStack.current}
          openApp={openApp} /> : null}

    </div>
  )
});

export default Desktop;

