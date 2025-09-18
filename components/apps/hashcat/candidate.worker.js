const charsetMap = {
  '?l': 'abcdefghijklmnopqrstuvwxyz',
  '?u': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  '?d': '0123456789',
  '?s': "!@#$%^&*()-_=+[]{};:'\",.<>/?`~",
  '?a':
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:'\",.<>/?`~",
};

let cancelled = false;

const parseMask = (mask = '') => {
  if (!mask) return [];
  const sets = [];
  for (let i = 0; i < mask.length; i += 1) {
    const char = mask[i];
    if (char === '?' && i < mask.length - 1) {
      const token = mask.slice(i, i + 2);
      const charset = charsetMap[token];
      if (charset) {
        sets.push(charset.split(''));
        i += 1;
        continue;
      }
    }
    sets.push([char]);
  }
  return sets;
};

function* maskGenerator(charsets) {
  if (!charsets.length) {
    return;
  }
  const indices = new Array(charsets.length).fill(0);
  let complete = false;
  while (!complete) {
    yield charsets.map((set, idx) => set[indices[idx]]).join('');
    let position = charsets.length - 1;
    while (position >= 0) {
      indices[position] += 1;
      if (indices[position] < charsets[position].length) {
        break;
      }
      indices[position] = 0;
      position -= 1;
    }
    if (position < 0) {
      complete = true;
    }
  }
}

function* combinatorGenerator(left, right, joiner = '') {
  if (!left.length || !right.length) {
    return;
  }
  for (let i = 0; i < left.length; i += 1) {
    for (let j = 0; j < right.length; j += 1) {
      yield `${left[i]}${joiner}${right[j]}`;
    }
  }
}

const pumpIterator = (iterator, id, total, limit) => {
  if (total === 0) {
    self.postMessage({ id, total: 0, chunk: [], done: true });
    return;
  }
  let produced = 0;
  let chunk = [];
  const flush = (isDone) => {
    if (chunk.length) {
      self.postMessage({ id, chunk, total, done: isDone });
      chunk = [];
    } else if (isDone) {
      self.postMessage({ id, total, done: true });
    }
  };

  const step = () => {
    if (cancelled) {
      self.postMessage({ id, cancelled: true });
      return;
    }
    let iterations = 0;
    while (!cancelled && iterations < 256) {
      const next = iterator.next();
      if (next.done) {
        flush(true);
        return;
      }
      chunk.push(next.value);
      produced += 1;
      iterations += 1;
      if (chunk.length === 10) {
        self.postMessage({ id, chunk, total });
        chunk = [];
      }
      if (limit && produced >= limit) {
        flush(true);
        return;
      }
    }
    if (chunk.length) {
      self.postMessage({ id, chunk, total });
      chunk = [];
    }
    if (!cancelled) {
      setTimeout(step, 0);
    }
  };

  step();
};

self.onmessage = (event) => {
  const { data } = event;
  if (!data) return;
  if (data.type === 'cancel') {
    cancelled = true;
    return;
  }
  if (data.type === 'generate') {
    cancelled = false;
    const { id, sourceType, payload, limit = 50 } = data;
    if (sourceType === 'mask') {
      const sets = parseMask(payload?.mask || '');
      const total = sets.reduce((acc, set) => acc * set.length, 1);
      const iterator = maskGenerator(sets);
      pumpIterator(iterator, id, total, limit);
      return;
    }
    if (sourceType === 'combinator') {
      const left = Array.isArray(payload?.left) ? payload.left : [];
      const right = Array.isArray(payload?.right) ? payload.right : [];
      const joiner = typeof payload?.joiner === 'string' ? payload.joiner : '';
      const total = left.length * right.length;
      const iterator = combinatorGenerator(left, right, joiner);
      pumpIterator(iterator, id, total, limit);
    }
  }
};
