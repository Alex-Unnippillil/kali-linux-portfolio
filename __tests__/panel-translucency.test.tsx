import React from 'react';
import { render } from '@testing-library/react';
import TopPanel from '../components/desktop/TopPanel';

jest.mock('../components/menu/WhiskerMenu', () => () => <div />);
jest.mock('../components/util-components/PanelClock', () => () => <div />);
jest.mock('../components/util-components/status', () => () => <div />);

describe('TopPanel translucency', () => {
  it('applies blur with translucent background when supported', () => {
    const { container } = render(<TopPanel title="Test" />);
    const header = container.querySelector('header');
    expect(header).not.toBeNull();
    const className = header!.className;
    expect(className).toContain('bg-ub-grey');
    expect(className).toContain('supports-[backdrop-filter:blur(8px)]:backdrop-blur');
    expect(className).toContain('supports-[backdrop-filter:blur(8px)]:opacity-90');
    expect(className).toContain('supports-[backdrop-filter:blur(8px)]:bg-opacity-90');
  });
});
