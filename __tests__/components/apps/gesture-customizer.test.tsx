import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GestureCustomizer from '../../../components/apps/gesture-customizer';
import useOPFS from '../../../hooks/useOPFS';

jest.mock('../../../hooks/useOPFS', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('GestureCustomizer app', () => {
  const mockGetDir = jest.fn();
  const mockWriteFile = jest.fn();
  const mockReadFile = jest.fn();
  const mockListFiles = jest.fn();
  const mockedUseOPFS = useOPFS as jest.MockedFunction<typeof useOPFS>;

  beforeEach(() => {
    mockGetDir.mockResolvedValue({} as FileSystemDirectoryHandle);
    mockWriteFile.mockResolvedValue(true);
    mockReadFile.mockResolvedValue(null);
    mockListFiles.mockResolvedValue([]);

    mockedUseOPFS.mockReturnValue({
      supported: true,
      root: {} as FileSystemDirectoryHandle,
      getDir: mockGetDir,
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      deleteFile: jest.fn(),
      listFiles: mockListFiles,
    });
  });

  afterEach(() => {
    mockGetDir.mockReset();
    mockWriteFile.mockReset();
    mockReadFile.mockReset();
    mockListFiles.mockReset();
    mockedUseOPFS.mockReset();
  });

  it('renders gestures with assignable actions', () => {
    render(<GestureCustomizer />);
    expect(screen.getByText(/three-finger swipe up/i)).toBeInTheDocument();
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
  });

  it('shows a conflict prompt for actions that have keyboard shortcuts', async () => {
    const user = userEvent.setup();
    render(<GestureCustomizer />);

    const [firstSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(firstSelect, 'open-clipboard-manager');

    const prompt = await screen.findByRole('alertdialog');
    expect(prompt).toHaveTextContent(/Ctrl\+Shift\+V/i);

    await user.click(screen.getByRole('button', { name: /keep action/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Ctrl\+Shift\+V/i)).toBeInTheDocument();
  });

  it('saves presets to OPFS with a slugified file name', async () => {
    const user = userEvent.setup();
    const presetDir = { name: 'gestures' } as unknown as FileSystemDirectoryHandle;
    mockGetDir.mockResolvedValue(presetDir);

    render(<GestureCustomizer />);
    await user.type(
      screen.getByPlaceholderText(/window-management/i),
      'Team Flow',
    );
    await user.click(screen.getByRole('button', { name: /save preset/i }));

    await waitFor(() => expect(mockWriteFile).toHaveBeenCalled());
    const [fileName, payload, dirArg] = mockWriteFile.mock.calls[0];
    expect(fileName).toBe('team-flow.json');
    expect(typeof payload).toBe('string');
    expect(JSON.parse(payload).assignments).toBeDefined();
    expect(dirArg).toBe(presetDir);
  });
});
