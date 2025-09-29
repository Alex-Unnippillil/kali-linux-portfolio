"use client";

import React, { useId } from "react";

export interface AppBreadcrumb {
  label: string;
  onSelect?: () => void;
}

export interface AppTitleBarAction {
  id: string;
  label: string;
  onSelect: () => void;
  icon?: React.ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  tooltip?: string;
  pressed?: boolean;
  ariaExpanded?: boolean;
}

interface AppTitleBarProps {
  title: string;
  breadcrumbs?: AppBreadcrumb[];
  onBack?: () => void;
  backLabel?: string;
  contextLabel?: string;
  actions?: AppTitleBarAction[];
  actionsLabel?: string;
}

const AppTitleBar: React.FC<AppTitleBarProps> = ({
  title,
  breadcrumbs,
  onBack,
  backLabel = "Go back",
  contextLabel,
  actions,
  actionsLabel = "App actions",
}) => {
  const headingId = useId();
  const contextId = useId();
  const describedBy = contextLabel ? contextId : undefined;

  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700 bg-gray-900 px-3 py-2 text-white"
      aria-labelledby={headingId}
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring focus:ring-cyan-400"
          >
            {backLabel}
          </button>
        )}
        {breadcrumbs?.length ? (
          <nav
            className="flex min-w-0 items-center"
            aria-label={contextLabel ? `${contextLabel} navigation` : "App navigation"}
          >
            <ol className="flex flex-wrap items-center gap-1 text-sm text-gray-200">
              {breadcrumbs.map((crumb, index) => {
                const isCurrent = index === breadcrumbs.length - 1;
                const separator = index < breadcrumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {crumb.onSelect && !isCurrent ? (
                      <button
                        type="button"
                        onClick={crumb.onSelect}
                        className="rounded px-1 py-0.5 text-left hover:underline focus:outline-none focus:ring focus:ring-cyan-400"
                      >
                        {crumb.label}
                      </button>
                    ) : (
                      <span
                        className="truncate"
                        {...(isCurrent ? { "aria-current": "page" } : {})}
                      >
                        {crumb.label}
                      </span>
                    )}
                    {separator && <span aria-hidden="true" className="text-gray-500">/</span>}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}
        <h1
          id={headingId}
          className="truncate text-base font-semibold"
        >
          {title}
        </h1>
      </div>
      {contextLabel ? (
        <p id={contextId} className="sr-only">
          {contextLabel}
        </p>
      ) : null}
      {actions?.length ? (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={actionsLabel}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onSelect}
              className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={action.ariaLabel ?? action.label}
              title={action.tooltip ?? action.label}
              disabled={action.disabled}
              {...(typeof action.pressed === "boolean" ? { "aria-pressed": action.pressed } : {})}
              {...(typeof action.ariaExpanded === "boolean"
                ? { "aria-expanded": action.ariaExpanded }
                : {})}
            >
              {action.icon ? (
                <span className="flex items-center gap-1">
                  <span aria-hidden="true">{action.icon}</span>
                  <span className="sr-only">{action.label}</span>
                </span>
              ) : (
                action.label
              )}
            </button>
          ))}
        </div>
      ) : null}
    </header>
  );
};

export default AppTitleBar;
