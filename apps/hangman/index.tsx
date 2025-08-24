import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Hangman',
  description: 'Guess the hidden word before the hangman is complete',
};

const HangmanClient = dynamic(() => import('./client'), { ssr: false });

export default HangmanClient;
