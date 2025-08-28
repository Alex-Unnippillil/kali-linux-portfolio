import React from 'react';

interface BadgeProps {
  count?: number;
}

export default function Badge({ count = 0 }: BadgeProps) {
  if (!count) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
      {count}
    </span>
  );
}
