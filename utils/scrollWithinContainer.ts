/** Scroll one application panel without moving the desktop or its window chrome. */
export function scrollWithinContainer(
  container: HTMLElement | null,
  target: HTMLElement | null,
): void {
  if (!container || !target || !container.contains(target)) return;
  const top =
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop -
    container.clientTop;
  container.scrollTo?.({ top: Math.max(0, top - 18), behavior: "auto" });
}
