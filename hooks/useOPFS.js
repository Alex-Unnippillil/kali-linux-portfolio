export async function useOPFS(fileName) {
  const hasOPFS = !!navigator.storage?.getDirectory;
  if (!hasOPFS) {
    return {
      read: async () => localStorage.getItem(fileName) || '',
      write: async (text) => localStorage.setItem(fileName, text),
      append: async (text) => {
        const prev = localStorage.getItem(fileName) || '';
        localStorage.setItem(fileName, prev + text);
      },
      clear: async () => localStorage.removeItem(fileName),
      download: async () => {
        const text = localStorage.getItem(fileName) || '';
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
    };
  }
  const root = await navigator.storage.getDirectory();
  const fileHandle = await root.getFileHandle(fileName, { create: true });
  const read = async () => {
    const file = await fileHandle.getFile();
    return await file.text();
  };
  const write = async (text) => {
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  };
  const append = async (text) => {
    const current = await read();
    await write(current + text);
  };
  const clear = async () => {
    await write('');
  };
  const download = async () => {
    const text = await read();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  return { read, write, append, clear, download };
}
export default useOPFS;
