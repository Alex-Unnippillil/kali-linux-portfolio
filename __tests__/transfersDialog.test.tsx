import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import TransfersDialog from '../components/file-manager/TransfersDialog';
import { TransferManager } from '../components/file-manager/TransferManager';

function mockJob() {
  return {
    run: () => new Promise<void>(() => {}),
    pause: () => {},
    resume: () => {},
  };
}

describe('TransfersDialog', () => {
  test('shows copying and queued counts', () => {
    const manager = new TransferManager();
    manager.setMode('queued');
    render(<TransfersDialog manager={manager} />);
    act(() => {
      manager.start(mockJob());
      manager.start(mockJob());
    });
    expect(screen.getByTestId('summary').textContent).toBe('Copying 1, Queued 1');
  });

  test('pauses and resumes transfers', () => {
    const manager = new TransferManager();
    manager.setMode('queued');
    render(<TransfersDialog manager={manager} />);
    let job: any;
    act(() => {
      job = manager.start(mockJob());
      manager.start(mockJob());
    });
    const pauseBtn = screen.getByText('Pause');
    act(() => {
      fireEvent.click(pauseBtn);
    });
    expect(screen.getByTestId('summary').textContent).toBe('Copying 1');
    const resumeBtn = screen.getByText('Resume');
    act(() => {
      fireEvent.click(resumeBtn);
    });
    expect(screen.getByTestId('summary').textContent).toBe('Copying 1, Queued 1');
  });
});
