import type { Meta, StoryObj } from '@storybook/react';
import { useId, useRef, useState } from 'react';
import Overlay, { type OverlayVariant } from './Overlay';

const meta: Meta<typeof Overlay> = {
  title: 'UI/Overlay',
  component: Overlay,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Overlay>;

const OverlayDemo = ({ variant }: { variant: OverlayVariant }) => {
  const [open, setOpen] = useState(true);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const panelClasses =
    variant === 'drawer-right'
      ? 'h-full max-w-xs'
      : variant === 'sheet-bottom'
        ? 'w-full max-w-md'
        : 'w-full max-w-sm';

  return (
    <div className="flex min-h-[320px] items-center justify-center bg-gray-950 p-8 text-white">
      <button
        ref={triggerRef}
        type="button"
        className="rounded bg-blue-600 px-3 py-1 text-sm font-medium"
        onClick={() => setOpen(true)}
      >
        Open overlay
      </button>
      <Overlay
        open={open}
        onOpenChange={setOpen}
        labelledBy={titleId}
        describedBy={descriptionId}
        variant={variant}
        className={`${panelClasses} rounded bg-gray-900 p-4 text-white shadow-xl`}
        returnFocusRef={triggerRef}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id={titleId} className="text-lg font-semibold">
              Overlay preview
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded bg-gray-700 px-2 py-1 text-sm hover:bg-gray-600"
            >
              Close
            </button>
          </div>
          <p id={descriptionId} className="text-sm text-gray-200">
            This overlay demonstrates labelled and described content with focus
            management. Use the buttons below to explore its behavior.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium"
              onClick={() => alert('Primary action triggered')}
            >
              Primary action
            </button>
            <button
              type="button"
              className="rounded bg-gray-700 px-3 py-1 text-sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Overlay>
    </div>
  );
};

export const Modal: Story = {
  render: () => <OverlayDemo variant="center" />,
};

export const Drawer: Story = {
  render: () => <OverlayDemo variant="drawer-right" />,
};

export const Sheet: Story = {
  render: () => <OverlayDemo variant="sheet-bottom" />,
};
