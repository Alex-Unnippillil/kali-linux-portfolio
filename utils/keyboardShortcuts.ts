export function registerAltWheelWindowCycle(
  cycle: (direction: number) => void
) {
  const handleWheel = (e: WheelEvent) => {
    if (!e.altKey) return;
    e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    cycle(direction);
  };
  window.addEventListener('wheel', handleWheel, { passive: false });
  return () => window.removeEventListener('wheel', handleWheel);
}
