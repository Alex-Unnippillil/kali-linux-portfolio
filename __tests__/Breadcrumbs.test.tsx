import React from 'react';
import { render, screen } from '@testing-library/react';
import Breadcrumbs from '../components/ui/Breadcrumbs';

type HTMLElementPrototypeWithOverrides = typeof HTMLElement.prototype & {
  clientWidth?: number;
  scrollWidth?: number;
};

const elementPrototype = HTMLElement.prototype as HTMLElementPrototypeWithOverrides;

const originalClientWidth = Object.getOwnPropertyDescriptor(elementPrototype, 'clientWidth');
const originalScrollWidth = Object.getOwnPropertyDescriptor(elementPrototype, 'scrollWidth');

const mockLayout = (clientWidth: number, scrollWidth: number) => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return clientWidth;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get() {
      return scrollWidth;
    },
  });
};

const restoreLayout = () => {
  if (originalClientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
  } else {
    delete elementPrototype.clientWidth;
  }

  if (originalScrollWidth) {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', originalScrollWidth);
  } else {
    delete elementPrototype.scrollWidth;
  }
};

const noop = () => {};

describe('Breadcrumbs', () => {
  afterEach(() => {
    restoreLayout();
  });

  it('renders full crumb labels when space is sufficient', () => {
    mockLayout(600, 400);

    render(
      <Breadcrumbs
        path={[
          { name: 'root' },
          { name: 'Projects' },
          { name: 'Case Files' },
        ]}
        onNavigate={noop}
      />,
    );

    expect(screen.getByRole('button', { name: 'Projects' })).toHaveTextContent('Projects');
    expect(screen.getByRole('button', { name: 'Case Files' })).toHaveTextContent('Case Files');
  });

  it('middle-truncates intermediate crumbs when the path overflows', async () => {
    const intermediate = 'Extremely long folder name used for breadcrumb overflow testing';
    const secondary = 'Second folder with a very long name to demonstrate truncation';

    mockLayout(220, 640);

    render(
      <Breadcrumbs
        path={[
          { name: 'root' },
          { name: intermediate },
          { name: secondary },
          { name: 'final-report.txt' },
        ]}
        onNavigate={noop}
      />,
    );

    const firstIntermediate = await screen.findByRole('button', { name: intermediate });
    const secondIntermediate = screen.getByRole('button', { name: secondary });

    const truncate = (label: string) => {
      if (label.length <= 24) {
        return label;
      }

      const ellipsis = '…';
      const keep = 24 - ellipsis.length;
      const start = Math.ceil(keep / 2);
      const end = Math.floor(keep / 2);

      return `${label.slice(0, start)}${ellipsis}${label.slice(label.length - end)}`;
    };

    expect(firstIntermediate).toHaveTextContent(truncate(intermediate));
    expect(secondIntermediate).toHaveTextContent(truncate(secondary));

    [firstIntermediate, secondIntermediate].forEach((element, index) => {
      const label = index === 0 ? intermediate : secondary;

      expect(element).toHaveAttribute('title', label);
      expect(element).toHaveAttribute('aria-label', label);
    });

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveClass('overflow-hidden');
  });
});
