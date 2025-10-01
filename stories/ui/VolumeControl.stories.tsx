import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';

import VolumeControl from '../../components/ui/VolumeControl';

const meta: Meta<typeof VolumeControl> = {
  title: 'UI/Volume Control',
  component: VolumeControl,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    test: { disable: true },
  },
};

export const OpensAndAdjusts: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole('button', { name: /Volume/i });

    await userEvent.click(toggle);
    const slider = await canvas.findByRole('slider', { name: /Volume level/i });
    await expect(slider).toBeInTheDocument();
    await expect(slider).toHaveFocus();
    await expect(slider).toHaveAttribute('aria-valuenow', '70');

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await expect(slider).toHaveAttribute('aria-valuenow', '68');

    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('slider', { name: /Volume level/i })).not.toBeInTheDocument();
    await expect(toggle).toHaveFocus();
  },
};

export const KeyboardOnlyFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.tab();
    const toggle = await canvas.findByRole('button', { name: /Volume/i });
    await expect(toggle).toHaveFocus();
    await userEvent.keyboard('{Enter}');

    const slider = await canvas.findByRole('slider', { name: /Volume level/i });
    await expect(slider).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    await expect(slider).toHaveAttribute('aria-valuenow', '72');

    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('slider', { name: /Volume level/i })).not.toBeInTheDocument();
  },
};
