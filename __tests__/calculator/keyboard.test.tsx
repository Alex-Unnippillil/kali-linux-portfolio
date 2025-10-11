import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Calculator from '../../apps/calculator';
import { memoryRecall, resetMemory, resetState } from '../../apps/calculator/logic';

describe('calculator keyboard shortcuts', () => {
  beforeEach(() => {
    resetState();
    resetMemory();
    window.localStorage.clear();
  });

  it('evaluates the current expression on Enter', async () => {
    render(<Calculator />);
    const display = await screen.findByLabelText('Calculator display');
    fireEvent.change(display, { target: { value: '2+2' } });
    fireEvent.keyDown(document, { key: 'Enter' });
    await waitFor(() => expect(display).toHaveValue('4'));
  });

  it('clears the display with Escape', async () => {
    render(<Calculator />);
    const display = await screen.findByLabelText('Calculator display');
    fireEvent.change(display, { target: { value: '123' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(display).toHaveValue(''));
  });

  it('handles memory shortcuts with the M key', async () => {
    render(<Calculator />);
    const display = await screen.findByLabelText('Calculator display');
    fireEvent.change(display, { target: { value: '7' } });
    fireEvent.keyDown(document, { key: 'M', shiftKey: true });
    await waitFor(() => expect(memoryRecall()).toBe('7'));
    fireEvent.change(display, { target: { value: '2' } });
    await waitFor(() => expect(display).toHaveValue('2'));
    fireEvent.keyDown(document, { key: 'm', ctrlKey: true });
    await waitFor(() => expect(memoryRecall()).toBe('5'));
    fireEvent.change(display, { target: { value: '' } });
    fireEvent.keyDown(document, { key: 'm' });
    await waitFor(() => expect(display).toHaveValue('5'));
  });
});
