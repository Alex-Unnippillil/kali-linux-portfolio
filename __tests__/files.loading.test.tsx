import { render, screen, waitFor } from '@testing-library/react';
import { lazy, Suspense } from 'react';

import FilesLoading from '../app/apps/files/loading';

describe('Files loading skeleton', () => {
  it('shows a skeleton while content resolves and hides it after load', async () => {
    const LazyContent = lazy(
      () =>
        new Promise<{ default: () => JSX.Element }>((resolve) => {
          setTimeout(() => {
            resolve({ default: () => <div>File explorer ready</div> });
          }, 10);
        }),
    );

    render(
      <Suspense fallback={<FilesLoading />}>
        <LazyContent />
      </Suspense>,
    );

    expect(screen.getByTestId('files-loading')).toBeInTheDocument();

    await screen.findByText('File explorer ready');
    await waitFor(() => expect(screen.queryByTestId('files-loading')).not.toBeInTheDocument());
  });
});
