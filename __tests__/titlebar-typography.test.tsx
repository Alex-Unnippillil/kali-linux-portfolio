import React from 'react';
import { render } from '@testing-library/react';
import TitleBar from '../components/window/TitleBar';

describe('TitleBar typography', () => {
  test('uses system font with custom letter spacing', () => {
    const { getByTestId } = render(<TitleBar title="Demo" />);
    const el = getByTestId('titlebar');
    const style = getComputedStyle(el);
    expect(style.fontFamily).toMatch(/system-ui/i);
    expect(style.letterSpacing).toBe('0.05em');
  });
});
