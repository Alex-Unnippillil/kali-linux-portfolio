import React, { useEffect, useMemo, useReducer, useState } from 'react';
import GameLayout from '../GameLayout';
import { createDefaultSeed } from './domain/rng';
import { HandState } from './domain/types';
import { useAnnouncements } from './hooks/useAnnouncements';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { DEFAULT_CONFIG, blackjackReducer, createBlackjackState } from './state/reducer';
import { loadState, saveState } from './state/persistence';
import { selectCanDeal, selectInsuranceAvailable, selectLegalActions } from './state/selectors';
import { BettingPanel } from './ui/BettingPanel';
import { Controls } from './ui/Controls';
import { OutcomeBanner } from './ui/OutcomeBanner';
import { RulesModal } from './ui/RulesModal';
import { ShoeMeter } from './ui/ShoeMeter';
import { Table } from './ui/Table';

class BlackjackErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <div className="p-3 text-sm">Blackjack hit an unexpected error.</div>;
    return this.props.children;
  }
}

const BlackjackApp = ({ windowMeta }: { windowMeta?: { isFocused?: boolean } }) => {
  // Pattern note: keeps input gating via shouldHandleGameKey + GameLayout to match other games.
  const [seed] = useState(createDefaultSeed());
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showRules, setShowRules] = useState(false);
  const [state, dispatchBase] = useReducer(
    (s: ReturnType<typeof createBlackjackState>, action: any) => blackjackReducer(s, action, config, seed),
    createBlackjackState(seed, config),
  );

  const dispatch = dispatchBase;
  const isFocused = windowMeta?.isFocused ?? true;

  useEffect(() => {
    const persisted = loadState();
    if (!persisted) return;
    dispatch({ type: 'HYDRATE', payload: persisted });
    if (persisted.config) {
      setConfig((prev) => ({ ...prev, ...persisted.config }));
    }
  }, [dispatch]);

  useEffect(() => {
    if (state.phase === 'DEALER_TURN') dispatch({ type: 'SETTLE' });
  }, [dispatch, state.phase]);

  useEffect(() => {
    saveState(state, config);
  }, [config, state]);

  const legalActions = useMemo(() => selectLegalActions(state, config), [state, config]);
  const canDeal = selectCanDeal(state);
  const insuranceAvailable = selectInsuranceAvailable(state);

  useKeyboardControls({
    isFocused,
    onAction: (action) => dispatch({ type: 'PLAYER_ACTION', action }),
    onNewRound: () => dispatch({ type: 'NEW_ROUND' }),
    onBetAdjust: (delta) => dispatch({ type: 'PLACE_BET', amount: state.bet + delta }),
    closeOverlay: () => setShowRules(false),
  });

  const announcement = useAnnouncements(state.eventLog[state.eventLog.length - 1]?.message ?? state.lastOutcome);

  const dealerHand: HandState = {
    id: 'dealer',
    cards: state.dealerHand,
    bet: 0,
    finished: true,
    doubled: false,
    surrendered: false,
    splitFromAces: false,
    canDraw: false,
  };

  return (
    <BlackjackErrorBoundary>
      <GameLayout title="Blackjack" gameId="blackjack" controlsLabel="Blackjack controls">
        <div className="relative h-full space-y-3 p-3 text-kali-text">
          <div className="sr-only" aria-live="polite">{announcement}</div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Bankroll: {state.bankroll}</span>
            <span>Streak: {state.stats.streak}</span>
            <button type="button" className="rounded bg-kali-muted px-2 py-1" onClick={() => setShowRules(true)}>Rules</button>
            <button type="button" className="rounded bg-kali-muted px-2 py-1" onClick={() => dispatch({ type: 'NEW_ROUND' })}>New Round (N)</button>
          </div>
          <BettingPanel
            bet={state.bet}
            bankroll={state.bankroll}
            onBetChange={(value) => dispatch({ type: 'PLACE_BET', amount: value })}
            onDeal={() => dispatch({ type: 'DEAL' })}
            canDeal={canDeal}
          />
          {state.playerHands.length > 0 && (
            <>
              <Table dealer={dealerHand} hands={state.playerHands} activeIndex={state.currentHandIndex} />
              {insuranceAvailable && (
                <button type="button" className="rounded bg-kali-muted px-3 py-1" onClick={() => dispatch({ type: 'TAKE_INSURANCE' })}>
                  Take Insurance
                </button>
              )}
              <Controls legalActions={legalActions} onAction={(action) => dispatch({ type: 'PLAYER_ACTION', action })} />
            </>
          )}
          <ShoeMeter remaining={state.shoe.cards.length} percent={(state.shoe.cards.length / (state.shoe.decks * 52)) * 100} />
          <OutcomeBanner text={state.lastOutcome} />
          <ul className="max-h-24 space-y-1 overflow-auto rounded border border-kali-border p-2 text-xs">
            {state.eventLog.map((item) => <li key={item.id}>{item.message}</li>)}
          </ul>
          <RulesModal open={showRules} config={config} onClose={() => setShowRules(false)} onSave={(next) => setConfig((prev) => ({ ...prev, ...next }))} />
        </div>
      </GameLayout>
    </BlackjackErrorBoundary>
  );
};

export default BlackjackApp;
