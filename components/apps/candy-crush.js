import React, { useState, useEffect, useCallback } from 'react';

const width = 8;
const candyColors = ['#ff6666', '#66b3ff', '#66ff66', '#ffcc66'];

const CandyCrush = () => {
  const [board, setBoard] = useState([]);
  const [dragged, setDragged] = useState(null);
  const [replaced, setReplaced] = useState(null);

  const createBoard = () => {
    const randomBoard = Array.from({ length: width * width }, () =>
      candyColors[Math.floor(Math.random() * candyColors.length)]
    );
    setBoard(randomBoard);
  };

  const checkForRowOfThree = useCallback(() => {
    for (let i = 0; i < width * width; i++) {
      const row = [i, i + 1, i + 2];
      const color = board[i];
      const invalid = [6, 7, 14, 15, 22, 23, 30, 31, 38, 39, 46, 47, 54, 55, 62, 63];
      if (invalid.includes(i)) continue;
      if (row.every((index) => board[index] === color)) {
        row.forEach((index) => (board[index] = ''));
        return true;
      }
    }
    return false;
  }, [board]);

  const checkForColumnOfThree = useCallback(() => {
    for (let i = 0; i <= width * (width - 3); i++) {
      const column = [i, i + width, i + width * 2];
      const color = board[i];
      if (column.every((index) => board[index] === color)) {
        column.forEach((index) => (board[index] = ''));
        return true;
      }
    }
    return false;
  }, [board]);

  const moveDown = useCallback(() => {
    for (let i = board.length - 1; i >= 0; i--) {
      if (board[i] === '' && i >= width) {
        board[i] = board[i - width];
        board[i - width] = '';
      }
      if (i < width && board[i] === '') {
        board[i] = candyColors[Math.floor(Math.random() * candyColors.length)];
      }
    }
  }, [board]);

  const dragStart = (e) => setDragged(e.target);
  const dragDrop = (e) => setReplaced(e.target);
  const dragEnd = () => {
    if (!dragged || !replaced) return;
    const dragId = parseInt(dragged.getAttribute('data-id'));
    const replaceId = parseInt(replaced.getAttribute('data-id'));
    const validMoves = [dragId - 1, dragId + 1, dragId - width, dragId + width];
    if (!validMoves.includes(replaceId)) return;

    board[replaceId] = dragged.style.backgroundColor;
    board[dragId] = replaced.style.backgroundColor;

    const valid = checkForRowOfThree() || checkForColumnOfThree();
    if (!valid) {
      board[dragId] = dragged.style.backgroundColor;
      board[replaceId] = replaced.style.backgroundColor;
    }

    setBoard([...board]);
    setDragged(null);
    setReplaced(null);
  };

  useEffect(() => {
    createBoard();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const matched = checkForRowOfThree() || checkForColumnOfThree();
      if (matched) moveDown();
      setBoard([...board]);
    }, 200);
    return () => clearInterval(timer);
  }, [board, checkForRowOfThree, checkForColumnOfThree, moveDown]);

  return (
    <div className="flex justify-center items-center p-4 select-none">
      <div className="grid grid-cols-8 gap-1">
        {board.map((color, index) => (
          <div
            key={index}
            data-id={index}
            style={{ backgroundColor: color, width: '40px', height: '40px' }}
            draggable
            onDragStart={dragStart}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={(e) => e.preventDefault()}
            onDragLeave={(e) => e.preventDefault()}
            onDrop={dragDrop}
            onDragEnd={dragEnd}
          />
        ))}
      </div>
    </div>
  );
};

export default CandyCrush;
