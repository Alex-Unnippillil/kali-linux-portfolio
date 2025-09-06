import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import Panel from '../src/components/panel/Panel';

jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useDrag: () => [{ isDragging: false }, () => {}],
  useDrop: () => [{}, () => {}],
}));

jest.mock('react-dnd-html5-backend', () => ({}));
jest.mock('../src/components/panel/PanelPreferences', () => ({
  usePanelPreferences: () => ({ editMode: false, locked: false }),
}));

describe('panel keyboard navigation', () => {
  it('focuses and navigates plugins via keyboard', () => {
    const { getByText } = render(<Panel />);
    const first = getByText('Plugin A');
    const second = getByText('Plugin B');
    const clickSpy = jest.fn();
    first.addEventListener('click', clickSpy);

    fireEvent.keyDown(window, { key: 'Tab', altKey: true, ctrlKey: true });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(second);

    fireEvent.keyDown(second, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(first, { key: 'Enter' });
    expect(clickSpy).toHaveBeenCalled();

    fireEvent.keyDown(first, { key: 'Escape' });
    expect(document.activeElement).not.toBe(first);
  });
});
