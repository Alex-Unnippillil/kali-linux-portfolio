import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DataXrefs, {
  DataReference,
  buildReferenceIndex,
  createNormalizedReferences,
  filterNormalizedReferences,
} from '../components/apps/ghidra/DataXrefs';

beforeAll(() => {
  const g = globalThis as typeof globalThis & { ResizeObserver?: any };
  if (typeof g.ResizeObserver === 'undefined') {
    g.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe('DataXrefs helpers', () => {
  const largeDataset: DataReference[] = Array.from({ length: 50000 }, (_, idx) => ({
    id: `ref-${idx}`,
    targetId: idx % 2 === 0 ? `string-${idx}` : `const-${idx}`,
    targetType: idx % 2 === 0 ? 'string' : 'constant',
    value: idx % 2 === 0 ? `String literal ${idx}` : `${idx}`,
    location: { function: `func_${Math.floor(idx / 10)}`, offset: `0x${idx.toString(16)}` },
    preview: idx % 5 === 0 ? `mov eax, ${idx}` : undefined,
  }));

  it('buildReferenceIndex creates a fast lookup map', () => {
    const start = performance.now();
    const map = buildReferenceIndex(largeDataset);
    const duration = performance.now() - start;
    expect(map.size).toBe(largeDataset.length);
    expect(duration).toBeLessThan(150);
    expect(map.get('ref-4096')).toBe(4096);
    const lookupStart = performance.now();
    for (let i = 0; i < largeDataset.length; i += 50) {
      map.get(`ref-${i}`);
    }
    const lookupDuration = performance.now() - lookupStart;
    expect(lookupDuration).toBeLessThan(40);
  });

  it('filterNormalizedReferences respects query and type filters efficiently', () => {
    const normalized = createNormalizedReferences(largeDataset);
    const start = performance.now();
    const results = filterNormalizedReferences(normalized, 'string literal 4242', 'string');
    const duration = performance.now() - start;
    expect(results.find((ref) => ref.id === 'ref-4242')).toBeTruthy();
    expect(results.every((ref) => ref.targetType === 'string')).toBe(true);
    expect(duration).toBeLessThan(350);
  });
});

describe('DataXrefs component', () => {
  const references: DataReference[] = Array.from({ length: 40 }, (_, idx) => ({
    id: `ref-${idx}`,
    targetId: idx % 2 === 0 ? `s-${idx}` : `c-${idx}`,
    targetType: idx % 2 === 0 ? 'string' : 'constant',
    value: idx % 2 === 0 ? `Greeting ${idx}` : `0x${idx.toString(16)}`,
    location: { function: `func_${Math.floor(idx / 5)}`, offset: idx },
    preview: `Instruction ${idx}`,
  }));

  it('renders a virtualized list and exposes navigation history', async () => {
    render(<DataXrefs references={references} height={240} />);

    await waitFor(() => {
      expect(screen.getByTestId('xref-selection-status')).toBeInTheDocument();
    });

    const renderedButtons = screen.getAllByTestId('xref-row-button');
    expect(renderedButtons.length).toBeLessThanOrEqual(10);

    fireEvent.click(renderedButtons[0]);
    await waitFor(() => {
      expect(screen.getByTestId('xref-selection-status')).toHaveTextContent(
        'Greeting 0'
      );
    });

    fireEvent.click(renderedButtons[1]);
    await waitFor(() => {
      expect(screen.getByTestId('xref-selection-status')).toHaveTextContent(
        '0x1'
      );
    });

    const backButton = screen.getByRole('button', {
      name: /Go to previous reference/i,
    });
    fireEvent.click(backButton);

    await waitFor(() => {
      expect(screen.getByTestId('xref-selection-status')).toHaveTextContent(
        'Greeting 0'
      );
    });

    const forwardButton = screen.getByRole('button', {
      name: /Go to next reference/i,
    });
    fireEvent.click(forwardButton);

    await waitFor(() => {
      expect(screen.getByTestId('xref-selection-status')).toHaveTextContent(
        '0x1'
      );
    });
  });

  it('filters references from the search input', async () => {
    render(<DataXrefs references={references} height={240} />);

    const search = await screen.findByRole('searchbox', {
      name: /search data references/i,
    });
    fireEvent.change(search, { target: { value: 'Greeting 10' } });

    await waitFor(() => {
      const rendered = screen.getAllByTestId('xref-row-button');
      expect(rendered).toHaveLength(1);
      expect(rendered[0]).toHaveAccessibleName(/Greeting 10/);
    });
  });
});
