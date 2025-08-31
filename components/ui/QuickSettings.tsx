"use client";

import usePersistentState from '../../hooks/usePersistentState.js';
import { useEffect, ChangeEvent } from 'react';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [textSize, setTextSize] = usePersistentState('qs-text-size', 'medium');
  const [spacing, setSpacing] = usePersistentState('qs-spacing', 'normal');
  const [contrast, setContrast] = usePersistentState('qs-contrast', false);
  const [dyslexic, setDyslexic] = usePersistentState('qs-dyslexic-font', false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    root.classList.add(`text-size-${textSize}`);
  }, [textSize]);

  useEffect(() => {
    document.documentElement.classList.toggle('spacing-relaxed', spacing === 'relaxed');
  }, [spacing]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', contrast);
  }, [contrast]);

  useEffect(() => {
    document.documentElement.classList.toggle('dyslexia-font', dyslexic);
  }, [dyslexic]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Text size</span>
        <select
          value={textSize}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setTextSize(e.target.value)}
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Spacing</span>
        <select
          value={spacing}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSpacing(e.target.value)}
        >
          <option value="normal">Normal</option>
          <option value="relaxed">Relaxed</option>
        </select>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>High contrast</span>
        <input type="checkbox" checked={contrast} onChange={() => setContrast(!contrast)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Dyslexia font</span>
        <input type="checkbox" checked={dyslexic} onChange={() => setDyslexic(!dyslexic)} />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
