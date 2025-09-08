import React from 'react';
import { armBoards } from '../../data/arm-boards';

const ARMBoardsPage: React.FC = () => (
  <main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">ARM Boards</h1>
    <p>Images for ARM-based single-board computers.</p>
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {armBoards.map((board) => (
        <div key={board.slug} className="border rounded p-4 flex flex-col">
          <h2 className="font-semibold mb-2">{board.name}</h2>
          <ul className="flex flex-wrap gap-1 mt-auto">
            {board.architectures.map((arch) => (
              <li
                key={arch}
                className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs"
              >
                {arch}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </main>
);

export default ARMBoardsPage;
