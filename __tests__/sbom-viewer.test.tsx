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
  onmessage: (e: any) => void = () => {};
  constructor(_url: string | URL, _opts?: any) {}
  postMessage(msg: any) {
    if (msg.type === 'parse') {
      const parsed = parseSbomObject(cyclonedxSample);
      setTimeout(() => this.onmessage({ data: { type: 'done', sbom: parsed } }), 0);
    }
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
