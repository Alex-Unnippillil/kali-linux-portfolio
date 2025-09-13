'use client';

export default function TabSkeleton() {
  return (
    <div className="flex space-x-2 bg-gray-200 p-2 animate-pulse">
      <div className="h-8 w-32 rounded bg-gray-300" />
      <div className="h-8 w-24 rounded bg-gray-300" />
      <div className="h-8 w-20 rounded bg-gray-300" />
    </div>
  );
}

