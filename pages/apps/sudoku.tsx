import dynamic from 'next/dynamic';

const SudokuApp = dynamic(() => import('../../apps/sudoku'), { ssr: false });

export default SudokuApp;
