const setModulesSpy = jest.fn();
let firstStateCall = true;

jest.mock('react', () => {
  const actualReact = jest.requireActual<typeof import('react')>('react');
  return {
    ...actualReact,
    useState: jest.fn((initial: unknown) => {
      const result = actualReact.useState(initial as never);
      if (firstStateCall) {
        firstStateCall = false;
        const wrappedSetter = ((value: unknown) => {
          setModulesSpy(value);
          return (result[1] as (v: unknown) => unknown)(value);
        }) as typeof result[1];
        return [result[0], wrappedSetter];
      }
      return result;
    }),
  };
});

import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import PopularModules from '../components/PopularModules';

describe('PopularModules update flow', () => {
  beforeEach(() => {
    firstStateCall = true;
    setModulesSpy.mockClear();
  });

  it('calls setModules with parsed module data', async () => {
    const updatedModules = [
      {
        id: 'test-module',
        name: 'Test Module',
        description: 'A module from the API',
        tags: ['test'],
        log: [],
        results: [],
        data: 'Example data',
        inputs: [],
        lab: '#',
        options: [],
      },
    ];

    const originalFetch = global.fetch;
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ needsUpdate: true, latest: '2.0.0' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedModules,
      });

    (global as typeof globalThis & { fetch: typeof fetch }).fetch =
      mockFetch as unknown as typeof fetch;

    try {
      render(<PopularModules />);
      fireEvent.click(screen.getByRole('button', { name: /Update Modules/i }));

      await waitFor(() => {
        expect(setModulesSpy).toHaveBeenCalledWith(updatedModules);
      });
    } finally {
      (global as typeof globalThis & { fetch: typeof fetch }).fetch =
        originalFetch as typeof fetch;
    }
  });
});
