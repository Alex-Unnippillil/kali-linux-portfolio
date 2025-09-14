import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MirrorSelector from '../components/MirrorSelector';

describe('MirrorSelector', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('persists override and resets', async () => {
    const user = userEvent.setup();
    render(
      <MirrorSelector
        mirrors={[
          { url: 'http://a', name: 'A' },
          { url: 'http://b', name: 'B' },
        ]}
      />
    );

    await user.selectOptions(screen.getByLabelText('mirror-select'), 'http://b');
    expect(window.localStorage.getItem('mirrorOverride')).toBe('http://b');

    await user.click(screen.getByLabelText('reset-mirror'));
    expect(window.localStorage.getItem('mirrorOverride')).toBeNull();
  });
});
