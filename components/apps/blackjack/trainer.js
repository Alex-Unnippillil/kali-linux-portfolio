import React from 'react';
import PracticeCount from './PracticeCount';

const BlackjackTrainer = () => (
  <PracticeCount
    showExit={false}
    showNewShoe
    streakStorageKey="bj_trainer_best_streak"
    revealStorageKey="bj_trainer_reveal_count"
    title="Blackjack Trainer"
  />
);

export default BlackjackTrainer;
