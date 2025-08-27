let total = 0;
let completed = 0;

onmessage = (e) => {
  const { type, total: t, amount = 1, phase } = e.data;
  if (type === 'init') {
    total = t || 0;
    completed = 0;
    postMessage({ percent: 0, phase: 'wordlist' });
  } else if (type === 'increment') {
    completed += amount;
    let percent = total ? (completed / total) * 100 : 0;
    if (percent > 100) percent = 100;
    postMessage({ percent, phase });
  }
};
