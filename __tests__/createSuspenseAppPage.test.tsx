import { act, render, screen } from '@testing-library/react';
import createSuspenseAppPage from '../utils/createSuspenseAppPage';

const dynamicInvocations: Array<{
  loader: () => Promise<unknown>;
  options: Record<string, unknown>;
  Component: any;
}> = [];

jest.mock('next/dynamic', () => {
  return (loader: () => Promise<unknown>, options: Record<string, unknown>) => {
    let ready = false;
    let resolvePromise: () => void = () => {};
    const suspensePromise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const Component: any = (props: { label?: string }) => {
      if (!ready) {
        throw suspensePromise;
      }
      return (
        <div data-testid="dynamic-content">{props.label ?? 'loaded'}</div>
      );
    };

    Component.__resolve = async () => {
      ready = true;
      resolvePromise();
      await loader();
    };

    dynamicInvocations.push({ loader, options, Component });

    return Component;
  };
});

describe('createSuspenseAppPage', () => {
  beforeEach(() => {
    dynamicInvocations.length = 0;
  });

  it('wraps next/dynamic with suspense fallback and renders once resolved', async () => {
    const loader = jest.fn(() =>
      Promise.resolve({
        default: ({ label }: { label: string }) => (
          <div data-testid="module">{label}</div>
        ),
      }),
    );

    const Page = createSuspenseAppPage(loader, { appName: 'Lazy Demo' });

    render(<Page label="demo" />);

    expect(dynamicInvocations).toHaveLength(1);
    const call = dynamicInvocations[0];
    expect(call.options).toMatchObject({ suspense: true, ssr: false });

    const fallback = await screen.findByTestId('app-suspense-fallback');
    expect(fallback).toHaveTextContent('Loading Lazy Demo');

    await act(async () => {
      await call.Component.__resolve();
    });

    expect(await screen.findByTestId('dynamic-content')).toHaveTextContent(
      'demo',
    );
    expect(loader).toHaveBeenCalled();
  });
});
