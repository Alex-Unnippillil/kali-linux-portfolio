import React from 'react';

const defaultControls = [
  { id: 'ArrowLeft', label: 'Left' },
  { id: 'ArrowRight', label: 'Right' },
  { id: 'ArrowUp', label: 'Up' },
  { id: 'ArrowDown', label: 'Down' },
  { id: 'Space', label: 'A' },
];

export default function VirtualControls({ controls = defaultControls, onPress, onRelease }) {
  return (
    <div className="flex justify-center gap-2">
      {controls.map((ctrl) => (
        <button
          key={ctrl.id}
          className="px-4 py-2 bg-gray-700 text-white rounded select-none"
          onTouchStart={(e) => {
            e.preventDefault();
            onPress && onPress(ctrl.id);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onRelease && onRelease(ctrl.id);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onPress && onPress(ctrl.id);
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            onRelease && onRelease(ctrl.id);
          }}
        >
          {ctrl.label}
        </button>
      ))}
    </div>
  );
}
