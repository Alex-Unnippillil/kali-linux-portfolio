import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import TabbedWindow, { TabDefinition } from '../components/ui/TabbedWindow';

describe('TabbedWindow keyboard shortcuts', () => {
  const createTab = (label: string): TabDefinition => ({
    id: label,
    title: label,
    content: <div>{label}</div>,
  });

  const setup = () => {
    return render(
      <TabbedWindow
        initialTabs={[createTab('one'), createTab('two')]}
        onNewTab={() => createTab('new')}
      />,
    );
  };

  it('creates a new tab with Ctrl+Shift+T', () => {
    const { container, getAllByText } = setup();
    const root = container.firstChild as HTMLElement;
    fireEvent.keyDown(root, { key: 't', ctrlKey: true, shiftKey: true });
    expect(getAllByText('new').length).toBeGreaterThan(0);
  });

  it('switches tabs with Ctrl+Tab and Ctrl+Shift+Tab', () => {
    const { container, getByText } = setup();
    const root = container.firstChild as HTMLElement;
    const getContent = (label: string) => getByText(label, { selector: 'div' }).parentElement;
    // start on first tab
    expect(getContent('one')).toHaveClass('block');
    fireEvent.keyDown(root, { key: 'Tab', ctrlKey: true });
    expect(getContent('two')).toHaveClass('block');
    fireEvent.keyDown(root, { key: 'Tab', ctrlKey: true, shiftKey: true });
    expect(getContent('one')).toHaveClass('block');
  });

  it('closes a tab with Ctrl+W', () => {
    const { container, queryByText } = setup();
    const root = container.firstChild as HTMLElement;
    fireEvent.keyDown(root, { key: 'w', ctrlKey: true });
    expect(queryByText('one')).toBeNull();
  });
});
