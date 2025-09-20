import React from 'react';
import { render, screen } from '@testing-library/react';
import Window from '../../components/base/window';
import Taskbar from '../../components/screen/taskbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const testApps = [
  {
    id: 'app1',
    title: 'App One',
    icon: '/icons/app-one.png',
    screen: () => <div>App One Body</div>,
  },
  {
    id: 'app2',
    title: 'App Two',
    icon: '/icons/app-two.png',
    screen: () => <div>App Two Body</div>,
  },
];

const createStateMap = (value: (id: string) => boolean) =>
  Object.fromEntries(testApps.map((app) => [app.id, value(app.id)]));

const layerForFocus = (focusedId: string) => {
  const focused = createStateMap((id) => id === focusedId);
  const minimized = createStateMap(() => false);
  const closed = createStateMap(() => false);

  return (
    <>
      {testApps.map((app) => (
        <Window
          key={app.id}
          id={app.id}
          title={app.title}
          screen={app.screen}
          focus={() => {}}
          openApp={() => {}}
          addFolder={() => {}}
          closed={() => {}}
          hideSideBar={() => {}}
          hasMinimised={() => {}}
          isFocused={focused[app.id]}
          minimized={minimized[app.id]}
        />
      ))}
      <Taskbar
        apps={testApps}
        closed_windows={closed}
        minimized_windows={minimized}
        focused_windows={focused}
        openApp={() => {}}
        minimize={() => {}}
      />
    </>
  );
};

describe('Focus layering indicators', () => {
  it('update when active window changes', () => {
    const { rerender } = render(layerForFocus('app1'));

    const assertState = (activeId: string) => {
      testApps.forEach((app) => {
        const dialog = screen.getByRole('dialog', { name: new RegExp(app.title, 'i') });
        const taskbarButton = screen
          .getAllByRole('button', { name: new RegExp(app.title, 'i') })
          .find((node) => node.getAttribute('data-context') === 'taskbar');
        expect(taskbarButton).toBeDefined();
        const button = taskbarButton!;
        const indicator = button.querySelector('[data-indicator="window-state"]');
        const isActive = app.id === activeId;

        if (isActive) {
          expect(dialog).toHaveAttribute('aria-current', 'true');
          expect(dialog).toHaveAttribute('data-focused', 'true');
          expect(button).toHaveAttribute('aria-current', 'true');
          expect(button).toHaveAttribute('data-active', 'true');
          expect(indicator).not.toBeNull();
          expect(indicator).toHaveAttribute('data-active', 'true');
        } else {
          expect(dialog).not.toHaveAttribute('aria-current');
          expect(dialog).toHaveAttribute('data-focused', 'false');
          expect(button).not.toHaveAttribute('aria-current');
          expect(button).toHaveAttribute('data-active', 'false');
          expect(indicator).not.toBeNull();
          expect(indicator).toHaveAttribute('data-active', 'false');
        }
      });
    };

    assertState('app1');
    rerender(layerForFocus('app2'));
    assertState('app2');
  });
});
