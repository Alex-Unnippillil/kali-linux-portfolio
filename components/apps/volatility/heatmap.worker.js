self.onmessage = ({ data }) => {
  const cells = [];
  const {
    cellSize = 10,
    cols = 100,
    rows = 60,
  } = data || {};
  const types = ['process', 'dll', 'socket'];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      cells.push({
        x: x * cellSize,
        y: y * cellSize,
        width: cellSize,
        height: cellSize,
        value: Math.random(),
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
  }

  self.postMessage(cells);
};
