import React, { type ComponentType } from 'react';
import { render } from '@testing-library/react';

jest.mock('next/dynamic', () => {
  const React = require('react');
  return (_importer, options = {}) => {
    const LoadingComponent = options.loading;
    const DynamicComponent: React.FC<Record<string, unknown>> = (props) => {
      if (LoadingComponent) {
        return React.createElement(LoadingComponent, props);
      }
      return null;
    };
    DynamicComponent.displayName = 'NextDynamicMock';
    return DynamicComponent;
  };
});

jest.mock('../../components/HelpPanel', () => () => null);

import Calculator from '../../components/apps/calculator';
import WeatherApp from '../../components/apps/weather';
import WeatherWidget from '../../components/apps/weather_widget';
import QuoteApp from '../../components/apps/quote';
import StickyNotes from '../../components/apps/sticky_notes';
import SubnetCalculator from '../../components/apps/subnet-calculator';
import Terminal from '../../components/apps/terminal';

type Scenario = {
  name: string;
  Component: ComponentType;
  assertSnapshot: (node: HTMLElement) => void;
};

const scenarios: Scenario[] = [
  {
    name: 'Calculator',
    Component: Calculator,
    assertSnapshot: (node) => {
      expect(node).toMatchInlineSnapshot(`
        <div
          aria-atomic="true"
          aria-live="polite"
          class="text-sm text-white flex h-full w-full items-center justify-center bg-ub-cool-grey"
          data-testid="async-loader"
          role="status"
        >
          Loading Calculator...
        </div>
      `);
    },
  },
  {
    name: 'Weather app',
    Component: WeatherApp,
    assertSnapshot: (node) => {
      expect(node).toMatchInlineSnapshot(`
        <div
          aria-atomic="true"
          aria-live="polite"
          class="text-sm text-white flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center"
          data-testid="async-loader"
          role="status"
        >
          Loading Weather App...
        </div>
      `);
    },
  },
  {
    name: 'Weather widget',
    Component: WeatherWidget,
    assertSnapshot: (node) => {
      expect(node).toMatchInlineSnapshot(`
        <div
          aria-atomic="true"
          aria-live="polite"
          class="text-sm text-white flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center"
          data-testid="async-loader"
          role="status"
        >
          Loading Weather Widget...
        </div>
      `);
    },
  },
  {
    name: 'Quote app',
    Component: QuoteApp,
    assertSnapshot: (node) => {
      expect(node).toMatchInlineSnapshot(`
        <div
          aria-atomic="true"
          aria-live="polite"
          class="text-sm text-white flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center"
          data-testid="async-loader"
          role="status"
        >
          Loading Quote Generator...
        </div>
      `);
    },
  },
  {
    name: 'Sticky Notes',
    Component: StickyNotes,
    assertSnapshot: (node) => {
      expect(node).toMatchInlineSnapshot(`
        <div
          aria-atomic="true"
          aria-live="polite"
          class="text-sm text-white flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center"
          data-testid="async-loader"
          role="status"
        >
          Loading Sticky Notes...
        </div>
      `);
    },
  },
  {
    name: 'Subnet Calculator',
    Component: SubnetCalculator,
    assertSnapshot: (node) => {
      expect(node).toMatchInlineSnapshot(`
        <div
          aria-atomic="true"
          aria-live="polite"
          class="text-sm text-white flex h-full w-full items-center justify-center bg-ub-cool-grey"
          data-testid="async-loader"
          role="status"
        >
          Loading Subnet Calculator...
        </div>
      `);
    },
  },
  {
    name: 'Terminal',
    Component: Terminal,
    assertSnapshot: (node) => {
      expect(node).toMatchInlineSnapshot(`
        <div
          aria-atomic="true"
          aria-live="polite"
          class="text-sm text-white flex h-full w-full items-center justify-center bg-ub-cool-grey"
          data-testid="async-loader"
          role="status"
        >
          Loading Terminal...
        </div>
      `);
    },
  },
];

describe('async loader accessibility', () => {
  it.each(scenarios)('%s loader exposes a polite live region', ({ Component, assertSnapshot }) => {
    const { getByTestId } = render(<Component />);
    const loader = getByTestId('async-loader');
    expect(loader).toHaveAttribute('role', 'status');
    expect(loader).toHaveAttribute('aria-live', 'polite');
    assertSnapshot(loader);
  });
});
