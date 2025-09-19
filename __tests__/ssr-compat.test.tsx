/**
 * @jest-environment node
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import NotificationCenter from '../components/common/NotificationCenter';
import WhiskerMenu from '../components/menu/WhiskerMenu';
import ShortcutOverlay from '../components/common/ShortcutOverlay';
import ContextMenu from '../components/common/ContextMenu';
import GameSettingsPanel from '../components/game/GameSettingsPanel';
import InputHub from '../pages/input-hub';
import GamepadCalibration from '../pages/gamepad-calibration';
import ModuleWorkspace from '../pages/module-workspace';

jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
  }),
}));

jest.mock('@emailjs/browser', () => ({
  init: jest.fn(),
  send: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('next/image', () => {
  return function MockImage(props: any) {
    const { src, alt = '', ...rest } = props;
    const resolvedSrc = typeof src === 'string' ? src : src?.src || '';
    return React.createElement('img', { ...rest, src: resolvedSrc, alt });
  };
});

describe('SSR safety', () => {
  it('renders NotificationCenter without browser globals', () => {
    expect(() =>
      renderToString(
        <NotificationCenter>
          <div />
        </NotificationCenter>
      )
    ).not.toThrow();
  });

  it('renders WhiskerMenu without browser globals', () => {
    expect(() => renderToString(<WhiskerMenu />)).not.toThrow();
  });

  it('renders ShortcutOverlay without browser globals', () => {
    expect(() => renderToString(<ShortcutOverlay />)).not.toThrow();
  });

  it('renders ContextMenu without browser globals', () => {
    const ref = { current: null } as React.RefObject<HTMLElement>;
    expect(() => renderToString(<ContextMenu targetRef={ref} items={[]} />)).not.toThrow();
  });

  it('renders GameSettingsPanel without browser globals', () => {
    expect(() =>
      renderToString(
        <GameSettingsPanel
          onApplyKeymap={jest.fn()}
          getSnapshot={() => ({})}
          loadSnapshot={jest.fn()}
          currentScore={0}
        />
      )
    ).not.toThrow();
  });

  it('renders InputHub page without browser globals', () => {
    expect(() => renderToString(<InputHub />)).not.toThrow();
  });

  it('renders GamepadCalibration page without browser globals', () => {
    expect(() => renderToString(<GamepadCalibration />)).not.toThrow();
  });

  it('renders ModuleWorkspace page without browser globals', () => {
    expect(() => renderToString(<ModuleWorkspace />)).not.toThrow();
  });
});
