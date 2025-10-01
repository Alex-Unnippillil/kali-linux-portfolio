import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ExplorerView, { ExplorerEntry } from '../components/apps/file-explorer/ExplorerView';

describe('ExplorerView gestures', () => {
  const items: ExplorerEntry[] = [
    { key: 'file:a.txt', name: 'a.txt', kind: 'file' },
    { key: 'file:b.txt', name: 'b.txt', kind: 'file' },
    { key: 'directory:docs', name: 'docs', kind: 'directory' },
  ];

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('selects an item on long press', () => {
    jest.useFakeTimers();
    const handleSelectionChange = jest.fn();
    render(
      <ExplorerView
        items={items}
        selectedKeys={new Set()}
        onSelectionChange={handleSelectionChange}
        onOpenItem={jest.fn()}
        onRenameItem={jest.fn()}
      />,
    );

    const item = screen.getByText('a.txt').closest('[data-explorer-item="true"]');
    expect(item).not.toBeNull();

    fireEvent.pointerDown(item!, {
      pointerId: 1,
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
    });

    act(() => {
      jest.advanceTimersByTime(450);
    });

    expect(handleSelectionChange).toHaveBeenCalled();
    const lastCall = handleSelectionChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const selection = lastCall![0] as Set<string>;
    expect(Array.from(selection)).toContain('file:a.txt');
  });

  it('supports lasso selection with pointer drag', () => {
    const handleSelectionChange = jest.fn();
    render(
      <ExplorerView
        items={items}
        selectedKeys={new Set()}
        onSelectionChange={handleSelectionChange}
        onOpenItem={jest.fn()}
        onRenameItem={jest.fn()}
      />,
    );

    const container = screen.getByRole('grid');
    Object.defineProperty(container, 'getBoundingClientRect', {
      value: () => new DOMRect(0, 0, 400, 400),
    });

    const nodes = Array.from(document.querySelectorAll('[data-explorer-item="true"]')) as HTMLElement[];
    nodes.forEach((node, index) => {
      const left = index * 120;
      Object.defineProperty(node, 'getBoundingClientRect', {
        value: () => new DOMRect(left, 0, 100, 100),
      });
    });

    fireEvent.pointerDown(container, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 0,
      clientX: 10,
      clientY: 10,
    });

    fireEvent.pointerMove(container, {
      pointerId: 2,
      pointerType: 'mouse',
      clientX: 320,
      clientY: 180,
    });

    fireEvent.pointerUp(container, {
      pointerId: 2,
      pointerType: 'mouse',
      clientX: 320,
      clientY: 180,
    });

    expect(handleSelectionChange).toHaveBeenCalled();
    const lastCall = handleSelectionChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const selection = Array.from((lastCall![0] as Set<string>).values());
    expect(selection).toEqual(expect.arrayContaining(['file:a.txt', 'file:b.txt']));
  });

});
