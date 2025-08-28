const RAW_TUTORIAL = `
; Simple tutorial level
#####
#@$.#
#####

; Two box level
######
#@ $.#
######
`;
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
`;
export function parseLevels(data) {
    const levels = [];
    let current = [];
    data.split(/\r?\n/).forEach((line) => {
        if (line.trim() === '' || line.trim().startsWith(';')) {
            if (current.length) {
                levels.push(current);
                current = [];
            }
        }
        else {
            current.push(line);
        }
    });
    if (current.length)
        levels.push(current);
    return levels;
}
export const LEVEL_PACKS = [
    { name: 'Tutorial', difficulty: 'Easy', levels: parseLevels(RAW_TUTORIAL) },
    { name: 'Classic', difficulty: 'Medium', levels: parseLevels(RAW_CLASSIC) },
];
export const defaultLevels = LEVEL_PACKS[0].levels;
