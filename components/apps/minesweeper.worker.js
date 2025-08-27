self.onmessage = (e) => {
  const { board, sx, sy } = e.data || {};
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const queue = [[sx, sy]];
  visited[sx][sy] = true;
  const order = [];
  while (queue.length) {
    const [x, y] = queue.shift();
    const cell = board[x][y];
    if (cell.revealed || cell.flagged) continue;
    order.push([x, y]);
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
            const next = board[nx][ny];
            if (!next.mine && !next.flagged && !next.revealed) {
              visited[nx][ny] = true;
              queue.push([nx, ny]);
            }
          }
        }
      }
    }
  }
  self.postMessage({ order });
};
