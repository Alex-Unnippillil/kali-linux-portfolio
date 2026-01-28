export type Change = {
  value: string;
  added?: boolean;
  removed?: boolean;
};

export const diffLines = (oldStr: string, newStr: string): Change[] => {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const changes: Change[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (oldLines[i - 1] === newLines[j - 1]) {
      changes.push({ value: `${oldLines[i - 1]}\n` });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      changes.push({ value: `${oldLines[i - 1]}\n`, removed: true });
      i -= 1;
    } else {
      changes.push({ value: `${newLines[j - 1]}\n`, added: true });
      j -= 1;
    }
  }
  while (i > 0) {
    changes.push({ value: `${oldLines[i - 1]}\n`, removed: true });
    i -= 1;
  }
  while (j > 0) {
    changes.push({ value: `${newLines[j - 1]}\n`, added: true });
    j -= 1;
  }

  return changes.reverse();
};
