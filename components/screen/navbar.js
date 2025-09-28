'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Clock from '../util-components/clock';
import Status from '../util-components/status';
import QuickSettings from '../ui/QuickSettings';
import NotificationBell from '../ui/NotificationBell';
import WhiskerMenu from '../menu/WhiskerMenu';
import PerformanceGraph from '../ui/PerformanceGraph';
import apps from '../../apps.config';
import styles from './navbar.module.css';

const QUICK_LAUNCH_IDS = ['terminal', 'vscode', 'chrome'];

const QUICK_LAUNCH_ITEMS = QUICK_LAUNCH_IDS.map((id) => {
  const match = apps.find((app) => app.id === id);
  if (!match) return null;
  const icon = typeof match.icon === 'string' && match.icon.startsWith('./')
    ? match.icon.replace('./', '/')
    : match.icon;
  return {
    id: match.id,
    title: match.title,
    icon,
  };
}).filter(Boolean);

const DEFAULT_WORKSPACE_STATE = {
  activeWorkspace: 0,
  workspaces: [],
};

const formatWorkspaceAriaLabel = (workspace) => {
  const count = Number(workspace?.openWindows) || 0;
  if (!count) return workspace.label;
  const suffix = count === 1 ? 'window' : 'windows';
  return `${workspace.label}, ${count} ${suffix}`;
};

const normalizeWorkspaceDetail = (detail) => {
  if (!detail || !Array.isArray(detail.workspaces)) {
    return DEFAULT_WORKSPACE_STATE;
  }
  const activeWorkspace =
    typeof detail.activeWorkspace === 'number' ? detail.activeWorkspace : 0;
  return {
    activeWorkspace,
    workspaces: detail.workspaces.map((workspace, index) => ({
      id: typeof workspace.id === 'number' ? workspace.id : index,
      label: workspace.label || `Workspace ${index + 1}`,
      openWindows: Number(workspace.openWindows) || 0,
    })),
  };
};

const dispatchWorkspaceChange = (workspaceId) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('set-active-workspace', { detail: workspaceId }),
  );
};

const dispatchOpenApp = (appId) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('open-app', { detail: appId }));
};

const Navbar = ({ lockScreen, shutDown }) => {
  const [statusOpen, setStatusOpen] = useState(false);
  const [workspaceState, setWorkspaceState] = useState(DEFAULT_WORKSPACE_STATE);
  const statusRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleSummary = (event) => {
      const nextState = normalizeWorkspaceDetail(event.detail);
      setWorkspaceState((prev) => {
        if (
          prev.activeWorkspace === nextState.activeWorkspace &&
          prev.workspaces.length === nextState.workspaces.length &&
          prev.workspaces.every((workspace, index) => {
            const next = nextState.workspaces[index];
            return (
              workspace &&
              next &&
              workspace.id === next.id &&
              workspace.label === next.label &&
              workspace.openWindows === next.openWindows
            );
          })
        ) {
          return prev;
        }
        return nextState;
      });
    };

    window.addEventListener('workspace-summary', handleSummary);
    return () => {
      window.removeEventListener('workspace-summary', handleSummary);
    };
  }, []);

  useEffect(() => {
    if (!statusOpen || typeof window === 'undefined') return undefined;

    const handlePointerDown = (event) => {
      if (!statusRef.current) return;
      if (!statusRef.current.contains(event.target)) {
        setStatusOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setStatusOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('touchstart', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('touchstart', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [statusOpen]);

  const handleQuickLaunch = useCallback((appId) => {
    dispatchOpenApp(appId);
  }, []);

  const handleWorkspaceSelect = useCallback((workspaceId) => {
    dispatchWorkspaceChange(workspaceId);
  }, []);

  const handleToggleStatus = useCallback(() => {
    setStatusOpen((prev) => !prev);
  }, []);

  const handleLock = useCallback(() => {
    if (typeof lockScreen === 'function') {
      lockScreen();
    }
  }, [lockScreen]);

  const handleShutDown = useCallback(() => {
    if (typeof shutDown === 'function') {
      shutDown();
    }
  }, [shutDown]);

  return (
    <header className={styles.navbar} role="banner">
      <div className={`${styles.section} ${styles.menuSection}`}>
        <WhiskerMenu />
      </div>
      <div
        className={`${styles.section} ${styles.quickLaunchSection}`}
        aria-label="Quick launch"
      >
        <div className={styles.quickLaunchList} role="group">
          {QUICK_LAUNCH_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.quickLaunchButton}
              onClick={() => handleQuickLaunch(item.id)}
              aria-label={`Open ${item.title}`}
              title={item.title}
            >
              <Image
                src={item.icon}
                alt=""
                width={24}
                height={24}
                className={styles.icon}
                sizes="24px"
              />
              <span className={styles.srOnly}>{item.title}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={`${styles.section} ${styles.workspaceSection}`}>
        <PerformanceGraph className={styles.performanceGraph} />
        {workspaceState.workspaces.length > 0 && (
          <div
            className={styles.workspaceList}
            role="radiogroup"
            aria-label="Workspaces"
          >
            {workspaceState.workspaces.map((workspace, index) => {
              const isActive = workspace.id === workspaceState.activeWorkspace;
              const badge = workspace.openWindows > 0;
              return (
                <button
                  key={workspace.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  aria-label={formatWorkspaceAriaLabel(workspace)}
                  onClick={() => handleWorkspaceSelect(workspace.id)}
                  className={`${styles.workspaceButton} ${
                    isActive ? styles.workspaceButtonActive : ''
                  }`}
                  data-active={isActive ? 'true' : 'false'}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {badge && !isActive && (
                    <span className={styles.workspaceBadge} aria-hidden="true">
                      {workspace.openWindows}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className={`${styles.section} ${styles.statusSection}`}>
        <NotificationBell />
        <div className={styles.statusToggle} ref={statusRef}>
          <button
            type="button"
            id="status-bar"
            className={styles.statusButton}
            aria-haspopup="dialog"
            aria-expanded={statusOpen}
            onClick={handleToggleStatus}
          >
            <Status />
          </button>
          <QuickSettings open={statusOpen} />
        </div>
      </div>
      <div className={`${styles.section} ${styles.clockSection}`}>
        <Clock />
      </div>
      <div className={`${styles.section} ${styles.powerSection}`}>
        <button
          type="button"
          className={styles.powerButton}
          onClick={handleLock}
        >
          <Image
            src="/themes/Yaru/status/changes-prevent-symbolic.svg"
            alt=""
            width={20}
            height={20}
            className={styles.icon}
            sizes="20px"
          />
          <span>Lock</span>
        </button>
        <button
          type="button"
          className={styles.powerButton}
          onClick={handleShutDown}
        >
          <Image
            src="/themes/Kali/panel/power-button.svg"
            alt=""
            width={20}
            height={20}
            className={styles.icon}
            sizes="20px"
          />
          <span>Power</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
