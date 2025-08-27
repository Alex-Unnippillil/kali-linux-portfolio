export function toFraction(value, tolerance = 1e-10) {
  if (!Number.isFinite(value)) return String(value);
  const sign = value < 0 ? -1 : 1;
  let x = Math.abs(value);
  if (Math.floor(x) === x) return `${sign * x}/1`;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = x;
  while (true) {
    const a = Math.floor(b);
    const h = a * h1 + h2;
    const k = a * k1 + k2;
    const approx = h / k;
    if (Math.abs(x - approx) <= tolerance || k > 1000) {
      return `${sign * h}/${k}`;
    }
    h2 = h1; h1 = h;
    k2 = k1; k1 = k;
    b = 1 / (b - a);
  }
}
