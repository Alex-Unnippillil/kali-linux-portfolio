import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RecentSwitcher from '../components/common/RecentSwitcher';
import { writeRecentAppIds } from '../utils/recentStorage';

describe('RecentSwitcher', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders recent apps in MRU order', () => {
    writeRecentAppIds(['firefox', 'terminal', 'settings']);
    render(<RecentSwitcher />);
    fireEvent.keyDown(window, { key: 'e', ctrlKey: true });
    const items = screen.getAllByTestId('recent-switcher-item');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Firefox');
    expect(items[1]).toHaveTextContent('Terminal');
    expect(items[2]).toHaveTextContent('Settings');
  });

  it('supports clearing history with undo', () => {
    jest.useFakeTimers();
    writeRecentAppIds(['terminal', 'firefox']);
    render(<RecentSwitcher />);
    fireEvent.keyDown(window, { key: 'e', ctrlKey: true });
    fireEvent.click(screen.getByText('Clear history'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(screen.queryAllByTestId('recent-switcher-item')).toHaveLength(0);
    const undoButton = screen.getByText('Undo (5s)');
    fireEvent.click(undoButton);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    const items = screen.getAllByTestId('recent-switcher-item');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Terminal');
    expect(items[1]).toHaveTextContent('Firefox');
  });
});
