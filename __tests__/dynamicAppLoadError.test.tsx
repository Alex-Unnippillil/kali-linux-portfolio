import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import createDynamicApp from '../lib/createDynamicApp';
import ReactGA from 'react-ga4';

jest.mock('react-ga4', () => ({
  event: jest.fn(),
}));

jest.mock('next/dynamic', () => {
  const React = require('react');
  return (importer: any, { loading = () => null } = {}) => {
    return function DynamicComponent(props: any) {
      const [Comp, setComp] = React.useState<any>(null);
      React.useEffect(() => {
        importer().then((mod: any) => {
          setComp(() => mod.default || mod);
        });
      }, []);
      if (!Comp) {
        const Loading = loading;
        return <Loading />;
      }
      const Component = Comp;
      return <Component {...props} />;
    };
  };
});

describe('createDynamicApp', () => {
  it('renders fallback component when import fails', async () => {
    const FailingApp = createDynamicApp('non-existent', 'FailApp');
    render(<FailingApp />);
    await waitFor(() =>
      expect(screen.getByText('Failed to load FailApp.')).toBeInTheDocument()
    );
    expect(ReactGA.event).toHaveBeenCalledWith('exception', expect.any(Object));
  });
});
