import React from 'react';
import AppHelpModal, { ShortcutItem } from '../help/AppHelpModal';

const shortcuts: ShortcutItem[] = [
  {
    group: 'Search & focus',
    keys: ['/'],
    title: 'Focus search bar',
    description: 'Places focus in the search field so you can start typing immediately.',
  },
  {
    group: 'Playback control',
    keys: ['Space'],
    title: 'Play or pause',
    description: 'Toggles playback of the current video when focus is outside text inputs.',
  },
  {
    group: 'Loop controls',
    keys: ['A'],
    title: 'Mark loop start',
    description: 'Sets the current playback position as the loop starting point.',
  },
  {
    group: 'Loop controls',
    keys: ['B'],
    title: 'Mark loop end',
    description: 'Sets the current playback position as the loop ending point.',
  },
  {
    group: 'Loop controls',
    keys: ['S'],
    title: 'Toggle loop',
    description: 'Enables or disables looping between the defined start and end markers.',
  },
  {
    group: 'Queue management',
    keys: ['Q'],
    title: 'Add to queue',
    description: 'Places the current video at the end of the up-next queue.',
  },
  {
    group: 'Queue management',
    keys: ['L'],
    title: 'Save for later',
    description: 'Adds the current video to the watch later list.',
  },
  {
    group: 'Queue management',
    keys: ['N'],
    title: 'Play next queued video',
    description: 'Skips to the next item in the queue if one is available.',
  },
];

const YoutubeHelp: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <AppHelpModal
    title="YouTube shortcuts"
    description="Control playback, looping, and queueing with the keyboard. Shortcuts are ignored when typing in inputs."
    shortcuts={shortcuts}
    onClose={onClose}
  />
);

export default YoutubeHelp;
