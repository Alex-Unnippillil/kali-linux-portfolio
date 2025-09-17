import React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { HeadManagerContext } from 'next/dist/shared/lib/head-manager-context.shared-runtime';
import Meta from '../components/SEO/Meta';

const parseStructuredData = (elements: React.ReactElement[]) =>
  elements
    .filter(
      (element) =>
        element.type === 'script' &&
        element.props?.type === 'application/ld+json'
    )
    .map((element) => {
      try {
        const payload =
          element.props?.dangerouslySetInnerHTML?.__html ?? element.props?.children;
        return typeof payload === 'string' ? JSON.parse(payload) : null;
      } catch (error) {
        return null;
      }
    })
    .filter((data): data is Record<string, unknown> => Boolean(data));

describe('Meta structured data', () => {
  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
  });

  it('renders an ItemList of projects as CreativeWork entries', async () => {
    const headElements: React.ReactElement[] = [];
    const headManagerValue = {
      mountedInstances: new Set<React.ReactNode>(),
      updateHead: (state: React.ReactElement[]) => {
        headElements.splice(0, headElements.length, ...state);
      },
    };

    render(
      <HeadManagerContext.Provider value={headManagerValue}>
        <Meta />
      </HeadManagerContext.Provider>
    );

    await waitFor(() => {
      expect(
        headElements.some(
          (element) =>
            element.type === 'script' &&
            element.props?.type === 'application/ld+json'
        )
      ).toBe(true);
    });

    const structuredData = parseStructuredData(headElements);
    const itemList = structuredData.find((data) => data['@type'] === 'ItemList');

    expect(itemList).toBeDefined();
    expect(itemList?.itemListElement).toHaveLength(2);
    expect(itemList?.itemListElement?.[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'CreativeWork',
        name: 'Alpha',
        url: 'https://example.com/alpha-demo',
        image: 'https://unnippillil.com/demo/alpha.png',
        datePublished: '2021-01-15',
      },
    });
    expect(itemList?.itemListElement?.[1]).toMatchObject({
      '@type': 'ListItem',
      position: 2,
      item: {
        '@type': 'CreativeWork',
        name: 'Beta',
        url: 'https://example.com/beta-demo',
        image: 'https://unnippillil.com/demo/beta.png',
        datePublished: '2022-05-20',
      },
    });
  });
});

