export const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const settings = {
  motion: prefersReducedMotion ? 0 : 1,
  shakeIntensity: prefersReducedMotion ? 0 : 5,
};

export function hitPause(ms = 100, ref) {
  if (prefersReducedMotion) return;
  if (ref) {
    const prev = ref.current;
    ref.current = false;
    setTimeout(() => {
      ref.current = prev;
    }, ms);
  }
}

export function shake(target, intensity = 5, decay = 0.9) {
  if (prefersReducedMotion) return;
  const el = target || document.body;
  const start = el.style.transform;
  let power = intensity;
  function animate() {
    if (power <= 0.5) {
      el.style.transform = start;
      return;
    }
    const x = (Math.random() * 2 - 1) * power;
    const y = (Math.random() * 2 - 1) * power;
    el.style.transform = `translate(${x}px,${y}px)`;
    power *= decay;
    requestAnimationFrame(animate);
  }
  animate();
}

export function emitParticles({ x = 0, y = 0, count = 10, color = '#fff' } = {}) {
  if (prefersReducedMotion) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement('div');
    p.style.position = 'absolute';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.width = '4px';
    p.style.height = '4px';
    p.style.background = color;
    p.style.pointerEvents = 'none';
    frag.appendChild(p);
    tween({
      from: 1,
      to: 0,
      duration: 600,
      ease: easing.easeOutCubic,
      onUpdate: (v, t) => {
        p.style.transform = `translate(${Math.cos(t * 10 + i) * 20 * v}px, ${
          Math.sin(t * 10 + i) * 20 * v
        }px)`;
        p.style.opacity = v;
      },
      onComplete: () => p.remove(),
    });
  }
  document.body.appendChild(frag);
}

export function trail(path = []) {
  return path;
}

export function popupText(text, [x, y], container) {
  if (prefersReducedMotion) return;
  const el = document.createElement('div');
  el.textContent = text;
  el.style.position = 'absolute';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.pointerEvents = 'none';
  el.style.color = '#fff';
  (container || document.body).appendChild(el);
  tween({
    from: 1,
    to: 0,
    duration: 800,
    ease: easing.easeOutCubic,
    onUpdate: (v) => {
      el.style.transform = `translateY(${-(1 - v) * 20}px)`;
      el.style.opacity = v;
    },
    onComplete: () => el.remove(),
  });
}

export const easing = {
  linear: (t) => t,
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t) => (--t) * t * t + 1,
};

export function tween({ from = 0, to = 1, duration = 300, ease = easing.linear, onUpdate, onComplete }) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const v = from + (to - from) * ease(t);
    if (onUpdate) onUpdate(v, t);
    if (t < 1) {
      requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  }
  requestAnimationFrame(step);
}
