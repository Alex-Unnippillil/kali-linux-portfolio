const CHUNK_SIZE = 1024 * 1024; // 1MB

onmessage = async (e) => {
  const { file, text = '', rules = [] } = e.data;
  try {
    let wordCount = 0;
    let preview = [];
    if (file) {
      let offset = 0;
      let remainder = '';
      while (offset < file.size) {
        const blob = file.slice(offset, offset + CHUNK_SIZE);
        const chunk = await blob.text();
        const data = remainder + chunk;
        const lines = data.split(/\r?\n/);
        remainder = lines.pop() || '';
        for (const line of lines) {
          if (!line) continue;
          wordCount++;
          if (preview.length < 10) preview.push(line);
        }
        offset += CHUNK_SIZE;
      }
      if (remainder) {
        wordCount++;
        if (preview.length < 10) preview.push(remainder);
      }
    } else {
      const lines = text.split(/\r?\n/).filter(Boolean);
      wordCount = lines.length;
      preview = lines.slice(0, 10);
    }
    const ruleCount = rules.length || 1;
    const count = wordCount * ruleCount;
    const rate = 1_000_000; // 1M candidates per second
    const time = count / rate;
    postMessage({ count, time, preview });
  } catch (err) {
    postMessage({ error: err.message });
  }
};
