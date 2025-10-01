import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import InlineExamples, { InlineExampleSet } from '../components/common/InlineExamples';

describe('InlineExamples', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  const sampleSets: InlineExampleSet[] = [
    {
      id: 'first-set',
      title: 'Sample set',
      description: 'A helpful description',
      examples: [
        {
          id: 'example-1',
          label: 'Example 1',
          description: 'Example description',
          metadata: 'Metadata block',
          values: { greeting: 'hello' },
        },
      ],
    },
  ];

  it('invokes onApply with the selected example', () => {
    const onApply = jest.fn();
    render(
      <InlineExamples
        sets={sampleSets}
        onApply={onApply}
        storageKeyPrefix="inline-test"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'example-1', values: { greeting: 'hello' } }),
    );
  });

  it('persists collapse state when storage key is provided', () => {
    const { unmount } = render(
      <InlineExamples sets={sampleSets} onApply={() => {}} storageKeyPrefix="inline-test" />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('Example 1')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('inline-test:first-set')).toBe('1');

    unmount();

    render(
      <InlineExamples sets={sampleSets} onApply={() => {}} storageKeyPrefix="inline-test" />,
    );

    expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    expect(screen.queryByText('Example 1')).not.toBeInTheDocument();
  });
});
