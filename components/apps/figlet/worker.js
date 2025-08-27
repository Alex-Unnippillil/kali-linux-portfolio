import figlet from 'figlet';

const DB_NAME = 'figlet-fonts';
const STORE_NAME = 'fonts';

const dbPromise = new Promise((resolve, reject) => {
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = () => {
    req.result.createObjectStore(STORE_NAME);
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function loadFont(name) {
  const db = await dbPromise;
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const getReq = store.get(name);
  const cached = await new Promise((res, rej) => {
    getReq.onsuccess = () => res(getReq.result);
    getReq.onerror = () => rej(getReq.error);
  });

  if (cached) {
    figlet.parseFont(name, cached);
    return;
  }

  const mod = await import(
    `https://unpkg.com/figlet/importable-fonts/${encodeURIComponent(name)}.js`
  );
  const data = mod.default;
  figlet.parseFont(name, data);

  const txW = db.transaction(STORE_NAME, 'readwrite');
  txW.objectStore(STORE_NAME).put(data, name);
}

self.onmessage = async (e) => {
  const { text, font } = e.data;
  await loadFont(font);
  const rendered = figlet.textSync(text || '', { font });
  self.postMessage(rendered);
};

