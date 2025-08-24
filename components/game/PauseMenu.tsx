'use client';
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Settings from './Settings';

export default function PauseMenu() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="bg-gray-700 px-2 py-1 rounded" aria-label="pause">
          ||
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow" aria-label="pause menu">
            <Dialog.Title className="text-xl mb-2">Paused</Dialog.Title>
            <Settings />
            <Dialog.Close asChild>
              <button className="mt-4 bg-blue-500 text-white px-3 py-1 rounded">
                Resume
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
