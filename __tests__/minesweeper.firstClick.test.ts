import { generateBoard, ensureFirstClickSafe } from '../components/apps/minesweeper';

describe('minesweeper first click safety', () => {
  test('repositions mine and keeps mine count stable', () => {
    const board = generateBoard(12345, 3, 3);
    const size = board.length;

    // move an existing mine to (0,0) to simulate unsafe first click
    outer: for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (board[i][j].mine) {
          board[i][j].mine = false;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              if (dx === 0 && dy === 0) continue;
              const nx = i + dx;
              const ny = j + dy;
              if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                board[nx][ny].adjacent -= 1;
              }
            }
          }
          break outer;
        }
      }
    }

    board[0][0].mine = true;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = dx;
        const ny = dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          board[nx][ny].adjacent += 1;
        }
      }
    }
    board[0][0].adjacent = 0;

    const before = board.flat().filter((c) => c.mine).length;
    ensureFirstClickSafe(board, 0, 0);
    const after = board.flat().filter((c) => c.mine).length;

    expect(board[0][0].mine).toBe(false);
    expect(after).toBe(before);

    // verify adjacency for first cell is correct after reposition
    let around = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = dx;
        const ny = dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny].mine) {
          around++;
        }
      }
    }
    expect(board[0][0].adjacent).toBe(around);
  });
});

