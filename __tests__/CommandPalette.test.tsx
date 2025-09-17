import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CommandPalette from '../components/system/CommandPalette';

describe('CommandPalette', () => {
  beforeEach(() => {
    document.documentElement.dir = 'ltr';
  });

  afterEach(() => {
    document.documentElement.dir = 'ltr';
  });

  it('resolves RTL direction and maintains caret selection for prefix matches', () => {
    document.documentElement.dir = 'rtl';
    const onSubmit = jest.fn();
    const onClose = jest.fn();

    render(
      <CommandPalette
        isOpen
        items={[
          { id: 'ls', label: 'ls' },
          { id: 'rtl', label: 'שלום' },
          { id: 'mixed', label: 'ls שלום' },
        ]}
        onClose={onClose}
        onSubmit={onSubmit}
        initialQuery=""
      />,
    );

    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.getAttribute('dir')).toBe('rtl');
    expect(input.className).toContain('text-right');

    fireEvent.change(input, { target: { value: 'ש' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(input.value).toBe('שלום');
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uses forward selection when matching in LTR contexts', () => {
    const onSubmit = jest.fn();
    render(
      <CommandPalette
        isOpen
        items={[
          { id: 'grep', label: 'grep' },
          { id: 'git', label: 'git status' },
        ]}
        onClose={jest.fn()}
        onSubmit={onSubmit}
        initialQuery=""
      />,
    );

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'g' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    expect(input.value).toBe('grep');
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
  });

  it('submits arbitrary queries when no suggestion is active', () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();

    render(
      <CommandPalette
        isOpen
        items={[]}
        onClose={onClose}
        onSubmit={onSubmit}
        initialQuery=""
      />,
    );

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'custom command' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith({ query: 'custom command', item: undefined });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = jest.fn();

    render(
      <CommandPalette
        isOpen
        items={[]}
        onClose={onClose}
        onSubmit={jest.fn()}
        initialQuery=""
      />,
    );

    const overlay = screen.getAllByRole('presentation')[0];
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });
});
