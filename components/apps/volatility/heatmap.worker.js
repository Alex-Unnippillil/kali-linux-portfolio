self.onmessage = ({ data }) => {
  const cells = [];
  const {
    cellSize = 10,
    cols = 100,
    rows = 60,
    segments = [],
  } = data || {};

  let segIndex = 0;
  let segCount = 0;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (segments[segIndex] && segCount >= segments[segIndex].size) {
        segIndex = Math.min(segIndex + 1, segments.length - 1);
        segCount = 0;
      }
      const type = segments[segIndex]?.type || 'process';
      cells.push({
        x: x * cellSize,
        y: y * cellSize,
        width: cellSize,
        height: cellSize,
        value: Math.random(),
        type,
      });
      segCount++;
    }
  }

  self.postMessage(cells);
};
