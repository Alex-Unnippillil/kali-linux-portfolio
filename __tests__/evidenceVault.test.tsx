import 'fake-indexeddb/auto';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import EvidenceVaultApp from '../components/apps/evidence-vault';

const resetEvidenceDb = () =>
  new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('evidence-vault');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });

describe('EvidenceVaultApp', () => {
  beforeEach(async () => {
    await resetEvidenceDb();
  });

  afterEach(async () => {
    await resetEvidenceDb();
  });

  afterAll(async () => {
    await resetEvidenceDb();
    await new Promise((resolve) => setTimeout(resolve, 25));
  });

  it('allows creating findings and linking code snippets as evidence', async () => {
    const user = userEvent.setup();
    render(<EvidenceVaultApp />);

    await user.type(screen.getByLabelText(/Finding title/i), 'SQL Injection');
    await user.type(
      screen.getByLabelText(/Finding summary/i),
      'Login form vulnerable to injection'
    );
    await user.click(screen.getByRole('button', { name: /add finding/i }));

    await screen.findByRole('button', {
      name: (name) => /^SQL Injection/i.test(name),
    });

    const addEvidenceButton = screen.getByRole('button', { name: /add evidence/i });
    expect(addEvidenceButton).toBeDisabled();

    await user.click(screen.getByLabelText(/Code snippet evidence/i));
    expect(addEvidenceButton).toBeDisabled();

    const snippetField = screen.getByLabelText(/^Snippet/, { selector: 'textarea' });
    await user.type(snippetField, 'SELECT * FROM users;');
    expect(addEvidenceButton).toBeEnabled();

    await user.click(addEvidenceButton);

    await waitFor(() => {
      expect(snippetField).toHaveValue('');
    });

    await screen.findByText(/SELECT \* FROM users;/i);
    expect(screen.getByText(/Linked findings:/i)).toHaveTextContent('SQL Injection');

    await user.click(screen.getByRole('button', { name: /Delete evidence/i }));
    await screen.findByText(/No evidence linked to this finding yet./i);
  });

  it('requires alt text before saving image evidence', async () => {
    const user = userEvent.setup();
    render(<EvidenceVaultApp />);

    const file = new File(['fake'], 'screenshot.png', { type: 'image/png' });
    const addEvidenceButton = screen.getByRole('button', { name: /add evidence/i });

    const readSpy = jest
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function mockRead(this: FileReader) {
        if (this.onload) {
          Object.defineProperty(this, 'result', {
            configurable: true,
            value: 'data:image/png;base64,ZmFrZQ==',
          });
          this.onload(new Event('load') as ProgressEvent<FileReader>);
        }
      });

    await user.upload(screen.getByLabelText(/Upload image/i), file);
    expect(addEvidenceButton).toBeDisabled();

    await user.type(screen.getByLabelText(/Alt text/i), 'Screenshot of the login portal');
    expect(addEvidenceButton).toBeEnabled();

    readSpy.mockRestore();
  });

  it('clears previously entered alt text when a new image is selected', async () => {
    const user = userEvent.setup();
    render(<EvidenceVaultApp />);

    const altInput = screen.getByLabelText(/Alt text/i);
    await user.type(altInput, 'Placeholder description');

    const file = new File(['fake'], 'screenshot.png', { type: 'image/png' });
    const readSpy = jest
      .spyOn(FileReader.prototype, 'readAsDataURL')
      .mockImplementation(function mockRead(this: FileReader) {
        if (this.onload) {
          Object.defineProperty(this, 'result', {
            configurable: true,
            value: 'data:image/png;base64,ZmFrZQ==',
          });
          this.onload(new Event('load') as ProgressEvent<FileReader>);
        }
      });

    await user.upload(screen.getByLabelText(/Upload image/i), file);

    await waitFor(() => {
      expect(altInput).toHaveValue('');
    });

    readSpy.mockRestore();
  });
});

