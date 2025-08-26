import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import MsfPostApp from '../components/apps/msf-post';

describe('MsfPostApp', () => {
  it('populates module when selecting a template', async () => {
    global.fetch = jest.fn(async () => ({
      json: async () => ({ modules: ['post/multi/gather/system_info'] }),
    })) as any;

    const { getByTestId } = render(<MsfPostApp />);

    await waitFor(() =>
      expect(getByTestId('module-select').children.length).toBeGreaterThan(1)
    );

    fireEvent.change(getByTestId('template-select'), {
      target: { value: 'post/multi/gather/system_info' },
    });

    expect(
      (getByTestId('module-select') as HTMLSelectElement).value
    ).toBe('post/multi/gather/system_info');
  });

  it('generates a report after running a module', async () => {
    global.URL.createObjectURL = jest.fn(() => 'blob:report');

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ modules: ['mod1'] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ output: 'result' }),
      }) as any;

    const { getByTestId } = render(<MsfPostApp />);

    await waitFor(() =>
      expect(getByTestId('module-select').children.length).toBeGreaterThan(1)
    );

    fireEvent.change(getByTestId('module-select'), {
      target: { value: 'mod1' },
    });

    fireEvent.click(getByTestId('run-button'));

    await waitFor(() => getByTestId('download-report'));
  });
});

