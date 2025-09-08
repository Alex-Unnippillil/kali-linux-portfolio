import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import GridOverlay from '../components/common/GridOverlay';

describe('GridOverlay', () => {
  it('toggles visibility with Alt+G', () => {
    const { container } = render(<GridOverlay />);
    expect(container.firstChild).toBeNull();
    fireEvent.keyDown(window, { key: 'g', altKey: true });
    expect(container.firstChild).not.toBeNull();
    fireEvent.keyDown(window, { key: 'g', altKey: true });
    expect(container.firstChild).toBeNull();
  });
});
