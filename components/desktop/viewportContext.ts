import React from "react";

export type DesktopViewportSize = {
  width: number;
  height: number;
};

export type DesktopViewportListener = (size: DesktopViewportSize) => void;

export type DesktopViewportContextValue = {
  subscribe: (listener: DesktopViewportListener) => () => void;
  getSize: () => DesktopViewportSize | null;
};

const noopUnsubscribe = () => {};
const noopGetSize = () => null;

export const desktopViewportDefaultValue: DesktopViewportContextValue = {
  subscribe: () => noopUnsubscribe,
  getSize: noopGetSize,
};

export const DesktopViewportContext = React.createContext<DesktopViewportContextValue>(
  desktopViewportDefaultValue,
);

export const useDesktopViewport = () => React.useContext(DesktopViewportContext);

