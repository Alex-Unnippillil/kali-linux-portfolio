import { fireEvent, render, screen } from '@testing-library/react';
import UndoConflictDialog from '../components/common/UndoConflictDialog';
import type { UndoConflict } from '../src/undo/types';
import type { Logger } from '../lib/logger';

const createLoggerMock = (): Logger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('UndoConflictDialog', () => {
  it('renders nothing when there is no conflict', () => {
    const logger = createLoggerMock();
    const { container } = render(
      <UndoConflictDialog conflict={null} onResolve={() => {}} logger={logger} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('renders conflict details and logs user actions', () => {
    const conflict: UndoConflict = {
      entryId: 'undo-1',
      entryLabel: 'Delete widget',
      message: 'A newer edit conflicts with this undo.',
      blockingEntries: [
        { id: 'undo-2', label: 'Rename widget' },
        { id: 'undo-3', label: 'Move widget' },
      ],
    };

    const logger = createLoggerMock();
    const onResolve = jest.fn();
    const onRetry = jest.fn();

    render(
      <UndoConflictDialog
        conflict={conflict}
        onResolve={onResolve}
        onRetry={onRetry}
        logger={logger}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(conflict.message)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(conflict.blockingEntries.length);
    expect(logger.warn).toHaveBeenCalledWith(
      'Undo conflict encountered',
      expect.objectContaining({ entryId: conflict.entryId }),
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Undo conflict retry requested',
      expect.objectContaining({ entryId: conflict.entryId }),
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Undo conflict dismissed',
      expect.objectContaining({ entryId: conflict.entryId }),
    );
  });
});
