import type { Meta, StoryObj } from '@storybook/react';
import { Button, type ButtonProps } from './Button';

const meta: Meta<ButtonProps> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered'
  },
  args: {
    children: 'Click me'
  },
  argTypes: {
    onClick: { action: 'clicked' }
  }
};

export default meta;

type Story = StoryObj<ButtonProps>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button'
  }
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button'
  }
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete'
  }
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button'
  }
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button'
  }
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading'
  }
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled'
  }
};

export const FocusVisible: Story = {
  args: {
    children: 'Focus Visible',
    autoFocus: true
  }
};
