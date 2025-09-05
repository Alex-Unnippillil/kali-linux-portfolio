import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NotesPanel from '../components/NotesPanel';

describe('NotesPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('adds, edits and deletes notes with persistence', () => {
    render(<NotesPanel />);
    const toggle = screen.getByRole('button', { name: /notes \(0\)/i });
    fireEvent.click(toggle);

    const input = screen.getByPlaceholderText(/quick add/i);
    fireEvent.change(input, { target: { value: 'test note' } });
    fireEvent.submit(input.closest('form')!);
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByTestId('note-live')).toHaveTextContent('Note added');
    expect(screen.getByDisplayValue('test note')).toBeInTheDocument();
    expect(localStorage.getItem('panelNotes')).toMatch('test note');

    const noteInput = screen.getByDisplayValue('test note');
    fireEvent.change(noteInput, { target: { value: 'updated' } });
    fireEvent.blur(noteInput);
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByTestId('note-live')).toHaveTextContent('Note updated');
    expect(localStorage.getItem('panelNotes')).toMatch('updated');

    const del = screen.getByRole('button', { name: /delete note/i });
    fireEvent.click(del);
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByTestId('note-live')).toHaveTextContent('Note deleted');
    expect(screen.queryByDisplayValue('updated')).not.toBeInTheDocument();
    expect(toggle).toHaveAccessibleName('Notes (0)');
  });
});

