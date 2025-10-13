import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import AllApplications from '../../components/screen/all-applications';

describe('AllApplications prefetch behaviour', () => {
  const renderAllApplications = (apps: any[]) =>
    render(
      <AllApplications
        apps={apps}
        games={[]}
        openApp={jest.fn()}
        searchInputRef={{ current: null }}
      />
    );

  beforeEach(() => {
    localStorage.clear();
  });

  it('prefetches heavy apps on hover when requested', async () => {
    const prefetch = jest.fn();
    renderAllApplications([
      {
        id: 'ghidra',
        title: 'Ghidra',
        icon: '/icon.svg',
        disabled: false,
        screen: { prefetch },
        loadHints: {
          strategy: 'lazy',
          prefetchOnHover: true,
          prefetchOnVisible: false,
        },
      },
    ]);

    const tile = await screen.findByRole('button', { name: 'Ghidra' });
    fireEvent.mouseEnter(tile);
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it('does not prefetch lightweight apps on hover', async () => {
    const prefetch = jest.fn();
    renderAllApplications([
      {
        id: 'calculator',
        title: 'Calculator',
        icon: '/icon.svg',
        disabled: false,
        screen: { prefetch },
      },
    ]);

    const tile = await screen.findByRole('button', { name: 'Calculator' });
    fireEvent.mouseEnter(tile);
    expect(prefetch).not.toHaveBeenCalled();
  });

  it('prefetches when the tile enters the viewport', async () => {
    const prefetch = jest.fn();
    const observers: { callback: IntersectionObserverCallback; instance: IntersectionObserver }[] = [];
    const originalObserver = global.IntersectionObserver;

    class MockObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;

      readonly rootMargin: string = '0px';

      readonly thresholds: ReadonlyArray<number> = [];

      constructor(callback: IntersectionObserverCallback) {
        observers.push({ callback, instance: this });
      }

      disconnect(): void {}

      observe(target: Element): void {
        (this as any).target = target;
      }

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }

      unobserve(): void {}
    }

    // @ts-expect-error override for test environment
    global.IntersectionObserver = MockObserver;

    try {
      renderAllApplications([
        {
          id: 'metasploit',
          title: 'Metasploit',
          icon: '/icon.svg',
          disabled: false,
          screen: { prefetch },
          loadHints: {
            strategy: 'lazy',
            prefetchOnHover: false,
            prefetchOnVisible: true,
          },
        },
      ]);

      await screen.findByRole('button', { name: 'Metasploit' });

      expect(prefetch).not.toHaveBeenCalled();

      const observer = observers[0];
      expect(observer).toBeDefined();

      await act(async () => {
        observer.callback([
          {
            isIntersecting: true,
            target: (observer.instance as any).target,
            intersectionRatio: 1,
            boundingClientRect: {} as DOMRectReadOnly,
            intersectionRect: {} as DOMRectReadOnly,
            rootBounds: null,
            time: Date.now(),
          },
        ], observer.instance);
      });

      expect(prefetch).toHaveBeenCalledTimes(1);
    } finally {
      global.IntersectionObserver = originalObserver;
    }
  });
});
