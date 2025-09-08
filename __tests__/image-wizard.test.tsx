import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageWizard from '../components/downloads/ImageWizard';

describe('ImageWizard', () => {
  test('walks through steps and shows recommendation with docs link', async () => {
    render(<ImageWizard />);

    // Step 1: platform
    expect(
      screen.getByText(/How do you plan to run Kali\?/i)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/Virtual Machine/i));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: desktop
    expect(
      screen.getByText(/Choose a desktop environment/i)
    ).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/GNOME/i));
    await userEvent.click(screen.getByRole('button', { name: /finish/i }));

    // Result
    expect(
      screen.getByText(/virtual machine image/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/non-authoritative recommendation/i)
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /documentation/i });
    expect(link).toHaveAttribute('href', 'https://www.kali.org/docs/');
  });
});
