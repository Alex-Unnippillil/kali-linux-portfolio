import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Explorer, { ExplorerNode } from '../apps/vscode/Explorer';

describe('VSCode Explorer virtualization', () => {
  const createLargeTree = (count: number): ExplorerNode[] => [{
    id: 'root',
    name: 'workspace',
    type: 'folder',
    children: Array.from({ length: count }, (_, index) => ({
      id: `file-${index}`,
      name: `file-${index}.txt`,
      type: 'file' as const,
    })),
  }];

  it('virtualizes large explorer trees', () => {
    const tree = createLargeTree(10000);

    const { container } = render(
      <div style={{ height: 320, width: 240 }}>
        <Explorer tree={tree} initialExpandedIds={['root']} />
      </div>
    );

    const items = container.querySelectorAll('[role="treeitem"]');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(100); // should not render all 10k nodes
  });

  it('keeps keyboard navigation and expansion behaviour', () => {
    const tree: ExplorerNode[] = [
      {
        id: 'root',
        name: 'workspace',
        type: 'folder',
        children: [
          { id: 'file-1', name: 'README.md', type: 'file' },
          {
            id: 'src',
            name: 'src',
            type: 'folder',
            children: [
              { id: 'component', name: 'App.tsx', type: 'file' },
            ],
          },
        ],
      },
    ];

    render(<Explorer tree={tree} initialExpandedIds={['root']} />);

    const treeElement = screen.getByRole('tree');
    treeElement.focus();

    const getSelected = () =>
      treeElement.querySelector('[role="treeitem"][aria-selected="true"]') as HTMLElement;

    expect(getSelected()).toHaveTextContent('workspace');

    fireEvent.keyDown(treeElement, { key: 'ArrowDown' });
    expect(getSelected()).toHaveTextContent('README.md');

    fireEvent.keyDown(treeElement, { key: 'ArrowDown' });
    expect(getSelected()).toHaveTextContent('src');

    fireEvent.keyDown(treeElement, { key: 'ArrowRight' });
    const srcItem = screen.getByText('src').closest('[role="treeitem"]');
    expect(srcItem).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(treeElement, { key: 'ArrowRight' });
    expect(getSelected()).toHaveTextContent('App.tsx');

    fireEvent.keyDown(treeElement, { key: 'ArrowLeft' });
    expect(getSelected()).toHaveTextContent('src');

    fireEvent.keyDown(treeElement, { key: 'ArrowLeft' });
    expect(srcItem).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(treeElement, { key: 'ArrowUp' });
    expect(getSelected()).toHaveTextContent('README.md');
  });
});

