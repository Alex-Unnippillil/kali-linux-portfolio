import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Sudoku = dynamic(() => import('../../apps/sudoku'), { ssr: false });

export default function SudokuPage() {
  return (
    <UbuntuWindow title="sudoku">
      <Sudoku />
    </UbuntuWindow>
  );
}
