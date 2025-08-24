'use client';
import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';

export default function Settings() {
  const [volume, setVolume] = useState<number[]>([50]);
  return (
    <div className="flex flex-col space-y-4" aria-label="settings">
      <div>
        <label className="block mb-1">Volume</label>
        <Slider.Root
          className="relative flex items-center w-40 h-5"
          value={volume}
          onValueChange={setVolume}
          max={100}
          step={1}
          aria-label="volume"
        >
          <Slider.Track className="bg-gray-200 relative grow rounded-full h-1">
            <Slider.Range className="absolute bg-blue-500 h-full rounded-full" />
          </Slider.Track>
          <Slider.Thumb className="block w-4 h-4 bg-white border rounded-full" />
        </Slider.Root>
      </div>
    </div>
  );
}
