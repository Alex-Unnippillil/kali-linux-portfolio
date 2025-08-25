export const RAW_LEVELS = `
; Simple tutorial level
#####
#@$.#
#####

; Two box level
######
#@ $.#
######
`;

export function parseLevels(data: string): string[][] {
  const levels: string[][] = [];
  let current: string[] = [];
  data.split(/\r?\n/).forEach((line) => {
    if (line.trim() === '' || line.trim().startsWith(';')) {
      if (current.length) {
        levels.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  });
  if (current.length) levels.push(current);
  return levels;
}

export const defaultLevels = parseLevels(RAW_LEVELS);
