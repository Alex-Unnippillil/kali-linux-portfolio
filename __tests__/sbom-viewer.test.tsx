import cyclonedxSample from './sbom-samples/cyclonedx.json';

jest.mock('@lib/sbom', () => {
  const actual = jest.requireActual('@lib/sbom');
  return {
    ...actual,
    fetchOsv: jest.fn(),
  };
});

import { parseSbomObject } from '@lib/sbom';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import SbomViewer from '@components/apps/sbom-viewer';

class MockWorker {
  onmessage: ((e: any) => void) | null = null;
  postMessage() {
    const parsed = parseSbomObject(cyclonedxSample);
    this.onmessage?.({ data: { type: 'done', sbom: parsed } });
  }
  terminate() {}
}

(global as any).Worker = MockWorker as any;

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
