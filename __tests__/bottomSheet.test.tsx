import React from 'react';
import { render } from '@testing-library/react';
import BottomSheet from '../components/base/BottomSheet';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

describe('BottomSheet', () => {
  it('sets inert attribute on root when open', () => {
    document.body.innerHTML = '<div id="__next"></div>';
    const root = document.getElementById('__next')!;
    render(
      <BottomSheet
        id="test"
        title="Test"
        screen={() => <div>content</div>}
        addFolder={() => {}}
        openApp={() => {}}
        closed={() => {}}
      />,
      { container: root }
    );
    expect(root.hasAttribute('inert')).toBe(true);
  });
});

