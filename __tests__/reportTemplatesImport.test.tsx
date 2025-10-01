import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportTemplates from '../components/apps/reconng/components/ReportTemplates';
import { FileDialogError, openFileDialog } from '../utils/fileDialogs';

jest.mock('../hooks/usePersistentState', () => {
  const react = require('react');
  return {
    __esModule: true,
    default: (key: string, initial: string) => {
      const [state, setState] = react.useState(initial);
      return [state, setState];
    },
  };
});

jest.mock('../utils/fileDialogs', () => {
  const actual = jest.requireActual('../utils/fileDialogs');
  return {
    ...actual,
    openFileDialog: jest.fn(),
  };
});

const mockedOpenFileDialog = openFileDialog as jest.MockedFunction<typeof openFileDialog>;

beforeEach(() => {
  mockedOpenFileDialog.mockReset();
});

it('displays an error message when an invalid template file is chosen', async () => {
  mockedOpenFileDialog.mockRejectedValueOnce(
    new FileDialogError('Report templates must be provided as a JSON export.', 'invalid-type'),
  );

  render(<ReportTemplates />);
  fireEvent.click(screen.getByText('Import/Share'));
  fireEvent.click(screen.getByText('Select JSON file'));

  await waitFor(() => {
    expect(screen.getByText(/Report templates must be provided/)).toBeInTheDocument();
  });
});

it('loads the sample template bundle on demand', async () => {
  render(<ReportTemplates />);
  fireEvent.click(screen.getByText('Import/Share'));
  fireEvent.click(screen.getByText('Load sample templates'));

  await waitFor(() => {
    expect(screen.getByText('Restored sample report templates.')).toBeInTheDocument();
  });
});
