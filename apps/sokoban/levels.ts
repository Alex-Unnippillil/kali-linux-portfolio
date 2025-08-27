export interface LevelPack {
  name: string;
  difficulty: string;
  levels: string[][];
}

const RAW_TUTORIAL = `
; Simple tutorial level
#####
#@$.#
#####

; Two box level
######
#@ $.#
######
` as const;

const RAW_CLASSIC = `
; Small puzzle
######
# .@ #
# $$ #
# .  #
######

; Room
#######
#  .  #
# $#$ #
# .@  #
#######
` as const;

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

export const LEVEL_PACKS: LevelPack[] = [
  { name: 'Tutorial', difficulty: 'Easy', levels: parseLevels(RAW_TUTORIAL) },
  { name: 'Classic', difficulty: 'Medium', levels: parseLevels(RAW_CLASSIC) },
] as const;

export const defaultLevels = LEVEL_PACKS[0].levels;

