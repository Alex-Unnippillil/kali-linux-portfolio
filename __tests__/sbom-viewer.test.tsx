import cyclonedxSample from './sbom-samples/cyclonedx.json';

jest.mock('@lib/sbom', () => {
  const actual = jest.requireActual('@lib/sbom');
  return {
    ...actual,
    readFileChunks: jest.fn(async () => JSON.stringify(cyclonedxSample)),
    fetchOsv: jest.fn(),
  };
});

import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import SbomViewer from '@components/apps/sbom-viewer';

describe('SBOM Viewer', () => {
  it('loads SBOM and displays components', async () => {
    render(<SbomViewer />);
    const file = new File(['dummy'], 'sbom.json', { type: 'application/json' });
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText('pkg1')).toBeInTheDocument());
    expect(screen.getByText('License Map')).toBeInTheDocument();
  });
});
