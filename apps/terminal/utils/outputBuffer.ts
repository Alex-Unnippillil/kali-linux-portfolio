const ANSI_REGEX = new RegExp(
  [
    '[\\u001B\\u009B][[\\]()#;?]*(?:',
    '(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]',
    '|(?:[a-zA-Z\\d]*(?:;[a-zA-Z\\d]*)*)?\\u0007',
    '|(?:.*?)(?:\\u0007|\\u001B\\\\)',
    ')',
  ].join(''),
  'g',
);

export const stripAnsi = (value: string) => value.replace(ANSI_REGEX, '');

export interface OutputBuffer {
  append: (chunk: string) => void;
  clear: () => void;
  getText: () => string;
  getLines: () => string[];
  setMaxLines: (count: number) => void;
}

export const createOutputBuffer = (maxLines = 1000): OutputBuffer => {
  let lines: string[] = [''];
  let limit = maxLines;

  const clamp = () => {
    if (lines.length > limit) {
      lines = lines.slice(lines.length - limit);
    }
  };

  const append = (chunk: string) => {
    const normalized = stripAnsi(chunk).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const segments = normalized.split('\n');
    const head = segments.shift() ?? '';
    lines[lines.length - 1] += head;
    segments.forEach((segment) => {
      lines.push(segment);
    });
    clamp();
  };

  return {
    append,
    clear: () => {
      lines = [''];
    },
    getText: () => lines.join('\n').trimEnd(),
    getLines: () => [...lines],
    setMaxLines: (count: number) => {
      limit = count;
      clamp();
    },
  };
};
