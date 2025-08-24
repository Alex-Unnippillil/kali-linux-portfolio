self.onmessage = async (e: MessageEvent) => {
  const { pattern, flags, textBuffer } = e.data as {
    pattern: string;
    flags: string;
    textBuffer: ArrayBuffer;
  };
  try {
    const stream = new Response(textBuffer).body!.pipeThrough(new TextDecoderStream());
    const reader = stream.getReader();
    let text = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      text += value;
    }

    const runEngine = async (engine: 'pcre' | 're2') => {
      const result: {
        compileTime: number | null;
        matchTime: number | null;
        match: any;
        error: string | null;
      } = { compileTime: null, matchTime: null, match: null, error: null };
      try {
        let regex: any;
        const compile = async () => {
          if (engine === 're2') {
            const mod = await import('re2-wasm');
            regex = new mod.RE2(pattern, flags.includes('u') ? flags : flags + 'u');
          } else {
            // @ts-ignore
            const mod = await import('@stephen-riley/pcre2-wasm');
            regex = new (mod as any).PCRE2(pattern, flags);
          }
        };
        const compileStart = performance.now();
        await Promise.race([
          compile(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Compile timeout')), 5000)),
        ]);
        result.compileTime = performance.now() - compileStart;

        const doMatch = () => regex.match(text);
        const matchStart = performance.now();
        result.match = await Promise.race([
          doMatch(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Match timeout')), 5000)),
        ]);
        result.matchTime = performance.now() - matchStart;
      } catch (err: any) {
        result.error = err.message || String(err);
      }
      return result;
    };

    const pcre = await runEngine('pcre');
    const re2 = await runEngine('re2');
    postMessage({ pcre, re2 });
  } catch (err: any) {
    postMessage({ error: err.message || String(err) });
  }
};
