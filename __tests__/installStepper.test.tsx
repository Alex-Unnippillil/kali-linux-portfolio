import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InstallStepper, { InstallStep } from '../components/InstallStepper';

describe('InstallStepper', () => {
  beforeEach(() => {
    // @ts-ignore
    navigator.clipboard = { writeText: jest.fn() };
  });

  it('copies command for current step', () => {
    const steps: InstallStep[] = [
      {
        id: 's1',
        title: 'Step 1',
        description: 'First',
        command: 'echo first',
      },
    ];
    render(<InstallStepper steps={steps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('echo first');
  });
});
