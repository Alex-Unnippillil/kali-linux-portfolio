import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import ProjectFilterBar from '../components/ProjectFilterBar';

const replace = jest.fn();

jest.mock('next/router', () => ({
  useRouter() {
    return {
      pathname: '/projects',
      query: {},
      replace,
    };
  },
}));

describe('ProjectFilterBar', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('updates query params when toggling tag', () => {
    const { getByText } = render(
      <ProjectFilterBar tags={['ui']} domains={[]} />
    );
    fireEvent.click(getByText('ui'));
    expect(replace).toHaveBeenCalledWith(
      { pathname: '/projects', query: { tags: 'ui' } },
      undefined,
      { shallow: true }
    );
  });
});
