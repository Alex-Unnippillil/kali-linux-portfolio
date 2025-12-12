import React from 'react';

import DiffView from '../components/common/DiffView';

const meta = {
  title: 'Common/DiffView',
  component: DiffView,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

const Template = (args: React.ComponentProps<typeof DiffView>) => <DiffView {...args} />;

export const TextDiff = Template.bind({});
TextDiff.args = {
  leftLabel: 'Baseline',
  rightLabel: 'Update',
  mode: 'text',
  left: 'Kali Linux Portfolio',
  right: 'Kali Linux Portfolio v2',
};

export const JsonDiff = Template.bind({});
JsonDiff.args = {
  leftLabel: 'Current',
  rightLabel: 'Incoming',
  mode: 'json',
  left: {
    name: 'Terminal',
    permissions: ['read', 'write'],
    theme: 'dark',
    pinned: true,
  },
  right: {
    name: 'Terminal',
    permissions: ['read', 'write', 'share'],
    theme: 'dark',
    pinned: false,
    telemetry: true,
  },
};
