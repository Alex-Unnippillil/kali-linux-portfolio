/* eslint-disable react/display-name */
import React from 'react';
import { render, screen, act, within } from '@testing-library/react';
import Navbar from '../components/screen/navbar';

jest.mock('../components/util-components/clock', () => () => <div data-testid="clock" />);
jest.mock('../components/util-components/status', () => () => <div data-testid="status" />);
jest.mock('../components/ui/QuickSettings', () => ({ open }: { open: boolean }) => (
  <div data-testid="quick-settings">{open ? 'open' : 'closed'}</div>
));
jest.mock('../components/menu/WhiskerMenu', () => () => <button type="button">Menu</button>);
jest.mock('../components/ui/PerformanceGraph', () => () => <div data-testid="performance" />);

describe('Navbar dock context integration', () => {
  it('marks pinned applications with dock context data attributes', () => {
    render(<Navbar />);

    act(() => {
      window.dispatchEvent(new CustomEvent('workspace-state', {
        detail: {
          workspaces: [],
          activeWorkspace: 0,
          runningApps: [],
          pinnedApps: [
            {
              id: 'pinned1',
              title: 'Pinned One',
              icon: '/icon.png',
              isRunning: false,
              isFocused: false,
              isMinimized: false,
            },
          ],
        },
      }));
    });

    const list = screen.getByRole('list', { name: /pinned applications/i });
    const button = within(list).getByRole('button', { name: /pinned one/i });
    expect(button).toHaveAttribute('data-context', 'dock');
  });
});
