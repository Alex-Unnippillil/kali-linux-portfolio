import { publish as pub, subscribe as sub } from './pubsub';

export interface NowPlayingState {
  track: string | null;
  playing: boolean;
}

const STATE_TOPIC = 'nowPlaying:state';
const CONTROL_TOPIC = 'nowPlaying:control';

let state: NowPlayingState = { track: null, playing: false };

export const getState = () => state;

export const setState = (partial: Partial<NowPlayingState>): void => {
  state = { ...state, ...partial };
  pub(STATE_TOPIC, state);
};

  export const subscribeState = (
    handler: (s: NowPlayingState) => void
  ): (() => void) => {
    handler(state);
    return sub(STATE_TOPIC, (data) => handler(data as NowPlayingState));
  };

export type ControlAction = 'play' | 'pause' | 'next' | 'prev';

export const control = (action: ControlAction): void => {
  pub(CONTROL_TOPIC, action);
};

  export const subscribeControl = (
    handler: (a: ControlAction) => void
  ): (() => void) => sub(CONTROL_TOPIC, (data) => handler(data as ControlAction));

export const play = () => control('play');
export const pause = () => control('pause');
export const next = () => control('next');
export const prev = () => control('prev');
