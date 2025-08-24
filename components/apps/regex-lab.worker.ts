self.onmessage = async (e: MessageEvent) => {
  const { engine, pattern, flags, textBuffer } = e.data as {
    engine: 're2' | 'pcre';
    pattern: string;
    flags: string;
    textBuffer: ArrayBuffer;
  };
  try {
    // Decode text using TextDecoderStream
    const stream = new Response(textBuffer).body!.pipeThrough(new TextDecoderStream());
    const reader = stream.getReader();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += value;
    }

    // Compile with timeout to detect catastrophic patterns
    let regex: any;
    const compile = async () => {
      if (engine === 're2') {
        const mod = await import('re2-wasm');
        regex = new mod.RE2(pattern, flags);
      } else {
        const mod = await import('@stephen-riley/pcre2-wasm');
        regex = new mod.PCRE2(pattern, flags);
      }
    };
    await Promise.race([
      compile(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Compile timeout')), 5000)),
    ]);

    // Run match with timeout
    const doMatch = async () => {
      if (engine === 're2') {
        return regex.match(text);
      }
      return regex.match(text);
    };
    const match = await Promise.race([
      doMatch(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Match timeout')), 5000)),
    ]);

    postMessage({ match });
  } catch (err: any) {
    const message: string = err.message || String(err);
    const posMatch = /position\s+(\d+)/i.exec(message);
    postMessage({ error: message, index: posMatch ? Number(posMatch[1]) : undefined, tip: 'Try simplifying the pattern or using non-greedy quantifiers.' });
  }
};
