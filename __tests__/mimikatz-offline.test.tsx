import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import MimikatzOffline from '../components/apps/mimikatz/offline';

// Mock FileReader to immediately return sample dump contents
class FileReaderMock {
  onload = null;
  readAsText() {
    const text = 'alice:pass1\nbob:pass2';
    if (this.onload) {
      this.onload({ target: { result: text } });
    }
  }
}

describe('MimikatzOffline', () => {
  beforeEach(() => {
    // @ts-ignore
    global.FileReader = FileReaderMock;
  });

  it('parses uploaded dump without network', () => {
    render(<MimikatzOffline />);
    const input = screen.getByLabelText('dump file');
    const file = new File(['dummy'], 'dump.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });
});
