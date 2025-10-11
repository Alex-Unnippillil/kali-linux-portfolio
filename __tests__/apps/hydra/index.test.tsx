import React from 'react';
import { render } from '@testing-library/react';
import HydraPreview from '../../../apps/hydra';

describe('HydraPreview layout', () => {
  let dateNowSpy: jest.SpyInstance<number, []>;

  beforeAll(() => {
    if (typeof ResizeObserver === 'undefined') {
      // @ts-ignore
      global.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
    }
  });

  beforeEach(() => {
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    dateNowSpy.mockRestore();
  });

  it('renders the hydra workbench layout', () => {
    const { asFragment } = render(<HydraPreview />);
    expect(asFragment()).toMatchSnapshot();
  });
});
