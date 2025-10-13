self.onmessage = (e) => {
  const { board, cells: starts } = e.data || {};
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue = [];
  (starts || []).forEach(([sx, sy]) => {
    if (sx >= 0 && sx < size && sy >= 0 && sy < size && !visited[sx][sy]) {
      visited[sx][sy] = true;
      queue.push([sx, sy]);
    }
  });
  const revealed = [];
  let hit = false;
  while (queue.length) {
    const [x, y] = queue.shift();
    const cell = board[x][y];
    if (cell.revealed || cell.flagged) continue;
    revealed.push([x, y]);
    if (cell.mine) {
      hit = true;
      continue;
    }
    if (cell.adjacent === 0) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            nx < size &&
            ny >= 0 &&
            ny < size &&
            !visited[nx][ny]
          ) {
            visited[nx][ny] = true;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
  self.postMessage({ cells: revealed, hit });
};
