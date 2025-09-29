import { render, screen } from '@testing-library/react';
import CheatSheetOverlay from '../components/desktop/CheatSheetOverlay';
import {
  DESKTOP_GESTURES,
  DESKTOP_KEY_BINDING_SECTIONS,
} from '../data/desktop/interactionGuides';

describe('CheatSheetOverlay', () => {
  test('renders key bindings and gestures from metadata', () => {
    render(<CheatSheetOverlay open onClose={() => {}} />);

    expect(
      screen.getByRole('dialog', { name: /desktop cheat sheet/i })
    ).toBeInTheDocument();

    const firstBinding = DESKTOP_KEY_BINDING_SECTIONS[0].bindings[0];
    expect(screen.getByText(firstBinding.title)).toBeInTheDocument();

    const firstGesture = DESKTOP_GESTURES[0];
    expect(screen.getByText(firstGesture.title)).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    const { queryByTestId } = render(<CheatSheetOverlay open={false} onClose={() => {}} />);
    expect(queryByTestId('cheat-sheet-overlay')).toBeNull();
  });
});
