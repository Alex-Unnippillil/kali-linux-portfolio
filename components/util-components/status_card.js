import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import SmallArrow from './small_arrow';
import useOnClickOutside from '../../hooks/useOnClickOutside';

function Slider(props) {
  return (
    <input
      type="range"
      onChange={props.onChange}
      className={props.className}
      name={props.name}
      aria-label={props['aria-label'] || props.name}
      min="0"
      max="100"
      value={props.value}
      step="1"
    />
  );
}

export default function StatusCard(props) {
  const wrapperRef = useRef(null);
  const [soundLevel, setSoundLevel] = useState(75);
  const [brightnessLevel, setBrightnessLevel] = useState(100);

  useOnClickOutside(wrapperRef, props.toggleVisible);

  useEffect(() => {
    const sound = Number(localStorage.getItem('sound-level') || 75);
    const brightness = Number(localStorage.getItem('brightness-level') || 100);
    setSoundLevel(sound);
    setBrightnessLevel(brightness);
    const monitor = document.getElementById('monitor-screen');
    if (monitor) {
      monitor.style.filter = `brightness(${(3 / 400) * brightness + 0.25})`;
    }
  }, []);

  const handleBrightness = (e) => {
    const value = e.target.value;
    setBrightnessLevel(value);
    localStorage.setItem('brightness-level', value);
    const monitor = document.getElementById('monitor-screen');
    if (monitor) {
      monitor.style.filter = `brightness(${(3 / 400) * value + 0.25})`;
    }
  };

  const handleSound = (e) => {
    const value = e.target.value;
    setSoundLevel(value);
    localStorage.setItem('sound-level', value);
  };

  return (
    <div
      ref={wrapperRef}
      className={
        'absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 status-card' +
        (props.visible ? ' visible animateShow' : ' invisible')
      }
    >
      {' '}
      {/* Status Card */}
      <div className="absolute w-0 h-0 -top-1 right-6 top-arrow-up" />
      <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/audio-headphones-symbolic.svg"
            alt="ubuntu headphone"
            sizes="16px"
          />
        </div>
        <Slider
          onChange={handleSound}
          className="ubuntu-slider w-2/3"
          value={soundLevel}
          name="headphone_range"
          aria-label="Headphone volume"
        />
      </div>
      <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/display-brightness-symbolic.svg"
            alt="ubuntu brightness"
            sizes="16px"
          />
        </div>
        <Slider
          onChange={handleBrightness}
          className="ubuntu-slider w-2/3"
          name="brightness_range"
          value={brightnessLevel}
          aria-label="Screen brightness"
        />
      </div>
      {/* Theme toggle removed for fixed Kali theme */}
      <div className="w-64 flex content-center justify-center">
        <div className="w-2/4 border-black border-opacity-50 border-b my-2 border-solid" />
      </div>
      <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
            alt="ubuntu wifi"
            sizes="16px"
          />
        </div>
        <div className="w-2/3 flex items-center justify-between text-gray-400">
          <span>TellMyWiFiLoveHer</span>
          <SmallArrow angle="right" />
        </div>
      </div>
      <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/bluetooth-symbolic.svg"
            alt="ubuntu bluetooth"
            sizes="16px"
          />
        </div>
        <div className="w-2/3 flex items-center justify-between text-gray-400">
          <span>Off</span>
          <SmallArrow angle="right" />
        </div>
      </div>
      <div className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20">
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/battery-good-symbolic.svg"
            alt="ubuntu battery"
            sizes="16px"
          />
        </div>
        <div className="w-2/3 flex items-center justify-between text-gray-400">
          <span>2:42 Remaining (77%)</span>
          <SmallArrow angle="right" />
        </div>
      </div>
      <div className="w-64 flex content-center justify-center">
        <div className="w-2/4 border-black border-opacity-50 border-b my-2 border-solid" />
      </div>
      <div
        id="open-settings"
        className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
      >
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/emblem-system-symbolic.svg"
            alt="ubuntu settings"
            sizes="16px"
          />
        </div>
        <div className="w-2/3 flex items-center justify-between">
          <span>Settings</span>
        </div>
      </div>
      <div
        onClick={props.lockScreen}
        className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
      >
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/changes-prevent-symbolic.svg"
            alt="ubuntu lock"
            sizes="16px"
          />
        </div>
        <div className="w-2/3 flex items-center justify-between">
          <span>Lock</span>
        </div>
      </div>
      <div
        onClick={props.shutDown}
        className="w-64 py-1.5 flex items-center justify-center bg-ub-cool-grey hover:bg-ub-warm-grey hover:bg-opacity-20"
      >
        <div className="w-8">
          <Image
            width={16}
            height={16}
            src="/themes/Yaru/status/system-shutdown-symbolic.svg"
            alt="ubuntu power"
            sizes="16px"
          />
        </div>
        <div className="w-2/3 flex items-center justify-between">
          <span>Power Off / Log Out</span>
          <SmallArrow angle="right" />
        </div>
      </div>
    </div>
  );
}
