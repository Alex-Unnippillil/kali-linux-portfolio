import { act, renderHook, waitFor } from '@testing-library/react';
import { useHelpSearch, HelpIndexEntry } from '@/hooks/useHelpSearch';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('useHelpSearch', () => {
  const docs: HelpIndexEntry[] = [
    {
      slug: 'getting-started',
      title: 'Getting Started',
      categories: ['Guides'],
      excerpt: 'Install dependencies and run the project locally.',
      markdown: '# Getting Started',
      searchText: 'getting started install dependencies run project locally',
    },
    {
      slug: 'nmap-nse-walkthrough',
      title: 'Nmap NSE Walkthrough',
      categories: ['Security'],
      excerpt: 'Run NSE scripts safely and review mitigation steps.',
      markdown: '# Nmap NSE Walkthrough',
      searchText: 'nmap nse walkthrough scripts mitigation security',
    },
    {
      slug: 'keyboard-only-test-plan',
      title: 'Keyboard-only Test Plan',
      categories: ['Testing'],
      excerpt: 'Checklist for verifying keyboard access.',
      markdown: '# Keyboard-only Test Plan',
      searchText: 'keyboard testing accessibility checklist',
    },
  ];

  it('filters results by search term and category and stores recents', async () => {
    const storage = new MemoryStorage();
    const { result } = renderHook(() =>
      useHelpSearch({ initialIndex: docs, storage, storageKey: 'help-test', recentLimit: 2 })
    );

    expect(result.current.categories).toEqual(['All', 'Guides', 'Security', 'Testing']);
    expect(result.current.results.map((doc) => doc.slug)).toEqual([
      'getting-started',
      'keyboard-only-test-plan',
      'nmap-nse-walkthrough',
    ]);

    await act(async () => {
      result.current.setSearchTerm('nmap');
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
      expect(result.current.results[0].slug).toBe('nmap-nse-walkthrough');
    });

    await act(async () => {
      result.current.setSelectedCategory('Security');
    });

    expect(result.current.results).toHaveLength(1);

    await act(async () => {
      result.current.selectDoc('nmap-nse-walkthrough');
      result.current.selectDoc('getting-started');
      result.current.selectDoc('nmap-nse-walkthrough');
    });

    await waitFor(() => {
      expect(result.current.recents.map((doc) => doc.slug)).toEqual([
        'nmap-nse-walkthrough',
        'getting-started',
      ]);
    });

    expect(storage.getItem('help-test')).toBe(
      JSON.stringify(['nmap-nse-walkthrough', 'getting-started'])
    );
  });

  it('clears recents when requested', async () => {
    const storage = new MemoryStorage();
    storage.setItem('help-test', JSON.stringify(['getting-started']));

    const { result } = renderHook(() =>
      useHelpSearch({ initialIndex: docs, storage, storageKey: 'help-test' })
    );

    await waitFor(() => {
      expect(result.current.recents).toHaveLength(1);
    });

    await act(async () => {
      result.current.clearRecents();
    });

    expect(result.current.recents).toHaveLength(0);
    expect(storage.getItem('help-test')).toBeNull();
  });
});
