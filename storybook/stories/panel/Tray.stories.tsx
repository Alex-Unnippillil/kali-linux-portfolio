import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

export type TrayProps = {
  mode: 'sni' | 'legacy';
  symbolic: boolean;
};

/**
 * Minimal stub of a Tray component used for Storybook documentation.
 * Real implementation would render tray icons according to the selected
 * mode and whether symbolic icons are enabled.
 */
const Tray = ({ mode, symbolic }: TrayProps) => (
  <div>
    <p>Mode: {mode}</p>
    <p>Symbolic icons: {symbolic ? 'on' : 'off'}</p>
  </div>
);

const meta: Meta<TrayProps> = {
  title: 'Panel/Tray',
  component: Tray,
  args: {
    mode: 'sni',
    symbolic: false,
  },
};
export default meta;

type Story = StoryObj<TrayProps>;

export const SniMode: Story = {
  args: {
    mode: 'sni',
  },
};

export const LegacyMode: Story = {
  args: {
    mode: 'legacy',
  },
};

export const SymbolicIconsOn: Story = {
  args: {
    symbolic: true,
  },
};

export const SymbolicIconsOff: Story = {
  args: {
    symbolic: false,
  },
};
