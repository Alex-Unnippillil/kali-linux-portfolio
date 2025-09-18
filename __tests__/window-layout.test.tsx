import React from 'react';
import { render, screen } from '@testing-library/react';
import WindowHeader from '../components/ubuntu/window/Header';
import { WindowEditButtons } from '../components/base/window';
import TabbedWindow, { TabDefinition } from '../components/ui/TabbedWindow';

describe('Window layout tokens', () => {
  it('applies spacing tokens to the window header', () => {
    render(<WindowHeader title="Alignment Check" />);
    const header = screen.getByRole('button', { name: 'Alignment Check' });
    expect(header.style.getPropertyValue('--window-header-padding')).toBe(
      'calc(var(--space-2) * 2)',
    );
    expect(header.style.getPropertyValue('--window-header-padding-sm')).toBe('var(--space-2)');
    expect(header.style.getPropertyValue('--window-header-min-height')).toBe(
      'calc(var(--hit-area) + var(--space-2))',
    );
  });

  it('applies spacing tokens to window control buttons', () => {
    const { container } = render(
      <WindowEditButtons
        minimize={() => undefined}
        maximize={() => undefined}
        isMaximised={false}
        close={() => undefined}
        id="tokens"
        allowMaximize
      />,
    );
    const controls = container.firstChild as HTMLElement;
    expect(controls.style.getPropertyValue('--window-controls-gap')).toBe('var(--space-2)');
    expect(controls.style.getPropertyValue('--window-control-size')).toBe('var(--hit-area)');
    expect(controls.style.getPropertyValue('--window-control-size-sm')).toBe(
      'calc(var(--hit-area) - var(--space-2))',
    );
  });
});

describe('TabbedWindow layout tokens', () => {
  const tabs: TabDefinition[] = [
    { id: 'one', title: 'First Tab', content: <div>One</div> },
    { id: 'two', title: 'Second Tab', content: <div>Two</div> },
  ];

  it('exposes spacing custom properties on the tab bar', () => {
    render(<TabbedWindow initialTabs={tabs} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist.style.getPropertyValue('--tab-bar-gap')).toBe('var(--space-2)');
    expect(tablist.style.getPropertyValue('--tab-height')).toBe('var(--hit-area)');
    expect(tablist.style.getPropertyValue('--tab-padding-inline')).toBe('calc(var(--space-2) * 2)');
    const firstTab = screen.getByRole('tab', { name: /First Tab/ });
    expect(firstTab.getAttribute('aria-selected')).toBe('true');
    const closeButtons = screen.getAllByRole('button', { name: 'Close Tab' });
    expect(closeButtons.length).toBeGreaterThan(0);
    expect(tablist.style.getPropertyValue('--tab-close-size')).toBe('calc(var(--hit-area) / 2)');
  });

  it('renders a new tab button with aligned hit area when provided', () => {
    const createTab = () => ({ id: 'three', title: 'Third Tab', content: <div>Three</div> });
    render(<TabbedWindow initialTabs={tabs} onNewTab={createTab} />);
    const newTabButton = screen.getByRole('button', { name: 'New Tab' });
    expect(newTabButton).toBeInTheDocument();
    const tablist = screen.getByRole('tablist');
    expect(tablist.style.getPropertyValue('--new-tab-size')).toBe('var(--hit-area)');
  });
});
