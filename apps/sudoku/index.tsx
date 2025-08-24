import dynamic from 'next/dynamic';

const SudokuClient = dynamic(() => import('./client'), { ssr: false });

export default SudokuClient;

