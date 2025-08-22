import React, { useState, useRef } from 'react';

const charPatterns = {
  A: ['  A  ', ' A A ', 'AAAAA', 'A   A', 'A   A'],
  B: ['BBBB ', 'B   B', 'BBBB ', 'B   B', 'BBBB '],
  C: [' CCCC', 'C    ', 'C    ', 'C    ', ' CCCC'],
  D: ['DDDD ', 'D   D', 'D   D', 'D   D', 'DDDD '],
  E: ['EEEEE', 'E    ', 'EEE  ', 'E    ', 'EEEEE'],
  F: ['FFFFF', 'F    ', 'FFF  ', 'F    ', 'F    '],
  G: [' GGGG', 'G    ', 'G  GG', 'G   G', ' GGGG'],
  H: ['H   H', 'H   H', 'HHHHH', 'H   H', 'H   H'],
  I: ['IIIII', '  I  ', '  I  ', '  I  ', 'IIIII'],
  J: ['JJJJJ', '    J', '    J', 'J   J', ' JJJ '],
  K: ['K   K', 'K  K ', 'KKK  ', 'K  K ', 'K   K'],
  L: ['L    ', 'L    ', 'L    ', 'L    ', 'LLLLL'],
  M: ['M   M', 'MM MM', 'M M M', 'M   M', 'M   M'],
  N: ['N   N', 'NN  N', 'N N N', 'N  NN', 'N   N'],
  O: [' OOO ', 'O   O', 'O   O', 'O   O', ' OOO '],
  P: ['PPPP ', 'P   P', 'PPPP ', 'P    ', 'P    '],
  Q: [' QQQ ', 'Q   Q', 'Q   Q', 'Q  QQ', ' QQQQ'],
  R: ['RRRR ', 'R   R', 'RRRR ', 'R  R ', 'R   R'],
  S: [' SSS ', 'S    ', ' SSS ', '    S', ' SSS '],
  T: ['TTTTT', '  T  ', '  T  ', '  T  ', '  T  '],
  U: ['U   U', 'U   U', 'U   U', 'U   U', ' UUU '],
  V: ['V   V', 'V   V', 'V   V', ' V V ', '  V  '],
  W: ['W   W', 'W   W', 'W W W', 'WW WW', 'W   W'],
  X: ['X   X', ' X X ', '  X  ', ' X X ', 'X   X'],
  Y: ['Y   Y', ' Y Y ', '  Y  ', '  Y  ', '  Y  '],
  Z: ['ZZZZZ', '   Z ', '  Z  ', ' Z   ', 'ZZZZZ'],
  '0': [' 000 ', '0   0', '0   0', '0   0', ' 000 '],
  '1': ['  1  ', ' 11  ', '  1  ', '  1  ', '11111'],
  '2': [' 222 ', '2   2', '   2 ', '  2  ', '22222'],
  '3': ['3333 ', '    3', ' 333 ', '    3', '3333 '],
  '4': ['4  4 ', '4  4 ', '44444', '   4 ', '   4 '],
  '5': ['55555', '5    ', '5555 ', '    5', '5555 '],
  '6': [' 666 ', '6    ', '6666 ', '6   6', ' 666 '],
  '7': ['77777', '   7 ', '  7  ', ' 7   ', '7    '],
  '8': [' 888 ', '8   8', ' 888 ', '8   8', ' 888 '],
  '9': [' 999 ', '9   9', ' 9999', '    9', ' 999 '],
  ' ': ['     ', '     ', '     ', '     ', '     '],
};

const textToAscii = (text) => {
  const lines = ['', '', '', '', ''];
  for (const ch of text.toUpperCase()) {
    const pattern = charPatterns[ch] || charPatterns[' '];
    for (let i = 0; i < 5; i += 1) {
      lines[i] += pattern[i] + ' ';
    }
  }
  return lines.join('\n');
};

const imageToAscii = (file, setAscii, canvasRef) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = 100;
      const height = (img.height / img.width) * width;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      const { data } = ctx.getImageData(0, 0, width, height);
      const chars = ['@', '#', 'S', '%', '?', '*', '+', ';', ':', ',', '.'];
      let ascii = '';
      for (let y = 0; y < height; y += 1) {
        let row = '';
        for (let x = 0; x < width; x += 1) {
          const offset = (y * width + x) * 4;
          const avg = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
          const charIndex = Math.floor((avg / 255) * (chars.length - 1));
          row += chars[chars.length - 1 - charIndex];
        }
        ascii += `${row}\n`;
      }
      setAscii(ascii);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

export default function AsciiArt() {
  const [text, setText] = useState('');
  const [ascii, setAscii] = useState('');
  const canvasRef = useRef(null);

  const handleText = () => {
    setAscii(textToAscii(text));
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      imageToAscii(file, setAscii, canvasRef);
    }
  };

  const copyAscii = () => {
    if (ascii) navigator.clipboard.writeText(ascii);
  };

  const downloadAscii = () => {
    if (!ascii) return;
    const blob = new Blob([ascii], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ascii-art.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white overflow-auto">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mb-2 p-2 bg-gray-700 text-white resize-none h-24"
        placeholder="Enter text here"
      />
      <button
        type="button"
        onClick={handleText}
        className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
      >
        Generate from Text
      </button>
      <input type="file" accept="image/*" onChange={handleFile} className="mb-4" />
      <canvas ref={canvasRef} className="hidden" />
      {ascii && (
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={copyAscii}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={downloadAscii}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Download
          </button>
        </div>
      )}
      <pre className="font-mono whitespace-pre overflow-auto">{ascii}</pre>
    </div>
  );
}

export const displayAsciiArt = () => <AsciiArt />;

