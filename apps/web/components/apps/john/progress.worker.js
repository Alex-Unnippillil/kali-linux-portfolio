let total = 0;
let completed = 0;

const curve = (x) => 1 - Math.pow(1 - x, 2);

onmessage = (e) => {
  const { type, total: t, amount = 1, phase } = e.data;
  if (type === 'init') {
    total = t || 0;
    completed = 0;
    postMessage({ percent: 0, phase: 'wordlist' });
  } else if (type === 'increment') {
    completed += amount;
    let raw = total ? completed / total : 0;
    if (raw > 1) raw = 1;
    const percent = curve(raw) * 100;
    postMessage({ percent, phase });
  }
};
