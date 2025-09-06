import React from 'react';
import { render } from '@testing-library/react';
import Navbar from '../components/screen/navbar';

describe('Navbar layout', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('applies grid rows from preferences', () => {
    window.localStorage.setItem('app:panel-rows', '2');
    const { container } = render(<Navbar />);
    const nav = container.firstChild as HTMLElement;
    expect(nav.style.gridTemplateRows).toBe('repeat(2, auto)');
  });
});

