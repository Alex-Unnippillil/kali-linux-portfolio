import dynamic from 'next/dynamic';

const Sudoku = dynamic(() => import('../../components/apps/sudoku'), { ssr: false });

export default function SudokuPage() {
  return <Sudoku />;
}
