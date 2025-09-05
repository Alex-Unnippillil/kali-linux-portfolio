"use client";

import { useState, useEffect, useCallback } from "react";
import LockScreen from "../screen/lock_screen";

export default function TimeOut() {
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [timeLeft, setTimeLeft] = useState(workMinutes * 60);
  const [isBreak, setIsBreak] = useState(false);

  // format time mm:ss
  const format = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // unlock screen when break ends
  const handleUnlock = useCallback(() => {
    if (timeLeft > 0) return;
    window.removeEventListener("click", handleUnlock);
    window.removeEventListener("keypress", handleUnlock);
    setIsBreak(false);
    setTimeLeft(workMinutes * 60);
  }, [timeLeft, workMinutes]);

  // countdown
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // switch between work and break
  useEffect(() => {
    if (timeLeft > 0) return;
    if (isBreak) {
      handleUnlock();
    } else {
      setIsBreak(true);
      setTimeLeft(breakMinutes * 60);
    }
  }, [timeLeft, isBreak, breakMinutes, handleUnlock]);

  // postpone break
  const postpone = () => {
    window.removeEventListener("click", handleUnlock);
    window.removeEventListener("keypress", handleUnlock);
    setIsBreak(false);
    setTimeLeft(5 * 60);
  };

  // update durations
  const onWorkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setWorkMinutes(val);
    if (!isBreak) setTimeLeft(val * 60);
  };
  const onBreakChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setBreakMinutes(val);
    if (isBreak) setTimeLeft(val * 60);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex space-x-4">
        <label className="flex flex-col">
          <span className="text-sm">Work (min)</span>
          <input
            type="number"
            min="1"
            value={workMinutes}
            onChange={onWorkChange}
            className="border p-1 w-20"
          />
        </label>
        <label className="flex flex-col">
          <span className="text-sm">Break (min)</span>
          <input
            type="number"
            min="1"
            value={breakMinutes}
            onChange={onBreakChange}
            className="border p-1 w-20"
          />
        </label>
      </div>
      <div className="text-center text-2xl">
        {isBreak ? "Break" : "Work"}: {format(timeLeft)}
      </div>
      {isBreak && (
        <button
          type="button"
          onClick={postpone}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded z-50"
          style={{ zIndex: 200 }}
        >
          Postpone 5 min
        </button>
      )}
      <LockScreen isLocked={isBreak} unLockScreen={handleUnlock} />
    </div>
  );
}

