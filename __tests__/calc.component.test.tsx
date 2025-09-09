import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Calculator from '../components/apps/calculator';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('Calculator component', () => {
  beforeEach(() => {
    global.math = require('mathjs');
  });

    it('evaluates expressions correctly', async () => {
      const { container } = render(<Calculator />);
      await flushPromises();
      const one = container.querySelector('button[data-value="1"]')!;
      const plus = container.querySelector('button[data-value="+"]')!;
      const equals = container.querySelector('button[data-action="equals"]')!;
      fireEvent.click(one);
      fireEvent.click(plus);
      fireEvent.click(one);
      fireEvent.click(equals);
      const display = document.getElementById('display') as HTMLInputElement;
      expect(display.value).toBe('2');
    });

    it('marks invalid expressions', async () => {
      const { container } = render(<Calculator />);
      await flushPromises();
      const two = container.querySelector('button[data-value="2"]')!;
      const plus = container.querySelector('button[data-value="+"]')!;
      const equals = container.querySelector('button[data-action="equals"]')!;
      fireEvent.click(two);
      fireEvent.click(plus);
      fireEvent.click(plus);
      fireEvent.click(equals);
      const display = document.getElementById('display') as HTMLInputElement;
      expect(display.classList.contains('error')).toBe(true);
    });

});
