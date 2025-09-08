import React from 'react';
import { render } from '@testing-library/react';
import Window from '../components/window/Window';

describe('Window chrome', () => {
  it('uses new class names and renders controls', () => {
    const { container } = render(
      <Window>
        <div>content</div>
      </Window>
    );
    const win = container.querySelector('.window');
    expect(win).toBeInTheDocument();
    const controls = container.querySelectorAll('.window-control');
    expect(controls).toHaveLength(3);
  });
});
