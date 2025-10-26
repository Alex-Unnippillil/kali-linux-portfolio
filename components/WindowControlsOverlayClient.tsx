"use client";

import { useEffect } from 'react';

type WindowControlsOverlayGeometryChangeEvent = Event & {
  visible: boolean;
};

type WindowControlsOverlay = {
  visible?: boolean;
  addEventListener: (
    type: 'geometrychange',
    listener: (event: WindowControlsOverlayGeometryChangeEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ) => void;
  removeEventListener: (
    type: 'geometrychange',
    listener: (event: WindowControlsOverlayGeometryChangeEvent) => void,
    options?: boolean | EventListenerOptions,
  ) => void;
};

type NavigatorWithWindowControlsOverlay = Navigator & {
  windowControlsOverlay?: WindowControlsOverlay;
};

const WindowControlsOverlayClient = () => {
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const htmlElement = document.documentElement;
    const overlay = (navigator as NavigatorWithWindowControlsOverlay).windowControlsOverlay;

    if (!overlay) {
      htmlElement.classList.remove('wco-visible');
      return undefined;
    }

    const updateVisibility = (isVisible: boolean) => {
      if (isVisible) {
        htmlElement.classList.add('wco-visible');
      } else {
        htmlElement.classList.remove('wco-visible');
      }
    };

    const handleGeometryChange = (event: WindowControlsOverlayGeometryChangeEvent) => {
      updateVisibility(Boolean(event.visible));
    };

    updateVisibility(Boolean(overlay.visible));

    overlay.addEventListener('geometrychange', handleGeometryChange);

    return () => {
      overlay.removeEventListener('geometrychange', handleGeometryChange);
      htmlElement.classList.remove('wco-visible');
    };
  }, []);

  return null;
};

export default WindowControlsOverlayClient;
