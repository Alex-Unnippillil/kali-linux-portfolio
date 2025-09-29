"use client";

import React, { Children, isValidElement, useMemo } from 'react';
import useGameInput from '../../hooks/useGameInput';

const safeAreaPadding = {
  paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
  paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)',
  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
  paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
};

const POSITION_PROP_NAMES = ['data-position', 'data-control-position', 'position'];

const resolvePosition = (child) => {
  if (!isValidElement(child)) return 'center';
  for (const propName of POSITION_PROP_NAMES) {
    const value = child.props?.[propName];
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['left', 'right', 'center'].includes(normalized)) {
        return normalized;
      }
    }
  }
  return 'center';
};

const groupControls = (children) => {
  const groups = { left: [], right: [], center: [] };
  Children.toArray(children)
    .filter((child) => child !== null && child !== undefined && child !== false)
    .forEach((child) => {
      const position = resolvePosition(child);
      groups[position].push(child);
    });
  return groups;
};

/**
 * Renders a container for virtual on-screen controls. It spaces controls to
 * the lower corners of the viewport, respects device safe areas and keeps
 * touch targets within reach on mobile screens. Controls can opt-into the
 * left, right or center stacks using a `data-position` attribute.
 */
export default function VirtualControls({ children, game }) {
  useGameInput({ game });

  const groupedControls = useMemo(() => groupControls(children), [children]);

  return (
    <div className="virtual-controls pointer-events-none absolute inset-0">
      <div
        className="flex h-full w-full flex-col justify-end"
        style={safeAreaPadding}
      >
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {groupedControls.left.length > 0 && (
            <div className="flex flex-col gap-3 pointer-events-auto sm:max-w-[45%]">
              {groupedControls.left.map((control, index) => (
                <div key={index} className="flex justify-start">
                  {control}
                </div>
              ))}
            </div>
          )}

          {groupedControls.center.length > 0 && (
            <div className="mt-4 flex w-full justify-center gap-3 pointer-events-auto sm:mt-0 sm:w-auto">
              {groupedControls.center.map((control, index) => (
                <div key={index}>{control}</div>
              ))}
            </div>
          )}

          {groupedControls.right.length > 0 && (
            <div className="flex flex-col gap-3 pointer-events-auto sm:max-w-[45%]">
              {groupedControls.right.map((control, index) => (
                <div key={index} className="flex justify-end">
                  {control}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
