import type { Meta, StoryObj } from '@storybook/react';

import ProgressBar from '../../components/ui/ProgressBar';

const meta: Meta<typeof ProgressBar> = {
  title: 'UI/Progress Bar',
  component: ProgressBar,
  args: {
    progress: 65,
  },
  parameters: {
    layout: 'centered',
    test: {
      disable: true,
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NearComplete: Story = {
  args: {
    progress: 95,
  },
};

export const Empty: Story = {
  args: {
    progress: 0,
  },
};
