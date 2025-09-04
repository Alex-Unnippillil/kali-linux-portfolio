import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionActionsButton from '../components/SessionActionsButton';

describe('SessionActionsButton', () => {
  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens and lists actions', () => {
    render(<SessionActionsButton />);
    const trigger = screen.getByLabelText('Session actions');
    fireEvent.click(trigger);
    expect(screen.getByText('Restart session')).toBeInTheDocument();
    expect(screen.getByText('Disconnect')).toBeInTheDocument();
  });

  it('closes after selecting an action', () => {
    render(<SessionActionsButton />);
    const trigger = screen.getByLabelText('Session actions');
    fireEvent.click(trigger);
    const action = screen.getByText('Restart session');
    fireEvent.click(action);
    expect(window.confirm).toHaveBeenCalledWith('Restart session?');
    expect(screen.queryByText('Restart session')).toBeNull();
  });

  it('closes when clicking outside the menu', () => {
    render(<SessionActionsButton />);
    const trigger = screen.getByLabelText('Session actions');
    fireEvent.click(trigger);
    fireEvent.click(screen.getByTestId('session-actions-overlay'));
    expect(screen.queryByText('Restart session')).toBeNull();
  });
});
