import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NavbarXfce from '../components/screen/navbar-xfce';
import fs from 'fs';
import path from 'path';

describe('NavbarXfce', () => {
  it('renders whisker and three launcher buttons', () => {
    render(<NavbarXfce />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
  });

  it('triggers click handlers', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    render(<NavbarXfce />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(logSpy).toHaveBeenCalledWith('whisker clicked');
    expect(logSpy).toHaveBeenCalledWith('launcher1 clicked');
    logSpy.mockRestore();
  });

  it('defines hover overlay style', () => {
    const file = path.join(__dirname, '..', 'components', 'screen', 'navbar-xfce.js');
    const source = fs.readFileSync(file, 'utf-8');
    expect(source).toContain(
      'color-mix(in srgb, var(--kali-accent) 15%, transparent)'
    );
  });
});

