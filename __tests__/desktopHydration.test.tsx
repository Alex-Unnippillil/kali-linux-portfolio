import React from 'react';
import { render } from '@testing-library/react';
import { readAllWindowStates } from '../utils/windowPersistence';

jest.mock('../utils/windowPersistence', () => ({
  readAllWindowStates: jest.fn(() => ({
    alpha: { x: 10, y: 20, width: 70, height: 65, maximized: true },
  })),
  writeWindowState: jest.fn(),
}));

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn() }));

describe('Desktop hydration manager', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hydrates persisted window layouts after mount', () => {
    const { default: DesktopWithSnap, Desktop } = require('../components/screen/desktop');
    const applySpy = jest.spyOn(Desktop.prototype, 'applyPersistedLayouts');
    jest.spyOn(Desktop.prototype, 'componentDidMount').mockImplementation(() => {});
    jest.spyOn(Desktop.prototype, 'componentWillUnmount').mockImplementation(() => {});
    jest.spyOn(Desktop.prototype, 'render').mockReturnValue(null);

    render(<DesktopWithSnap />);

    expect(readAllWindowStates).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledWith({
      alpha: { x: 10, y: 20, width: 70, height: 65, maximized: true },
    });
  });
});
