import { act, render } from '@testing-library/react';
import { composeStories } from '@storybook/react';
import * as stories from '../Button.stories';

describe('Button stories visual regression', () => {
  const composedStories = composeStories(stories);

  Object.entries(composedStories).forEach(([name, Story]) => {
    it(`${name} matches the snapshot`, () => {
      const { container, getByRole } = render(<Story />);

      if (name === 'FocusVisible') {
        act(() => {
          getByRole('button').focus();
        });
      }

      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
