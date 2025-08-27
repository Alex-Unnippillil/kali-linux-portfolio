// Very small wrapper for the Vibration API
export default function useGameHaptics() {
  const vibrate = (pattern = [50]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };
  return { vibrate };
}
