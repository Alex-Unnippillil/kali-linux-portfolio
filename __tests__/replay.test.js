import { createGame, guess } from '../apps/hangman/engine';
import { Replay } from '../utils/replay';
describe('replay system', () => {
    test('playback matches recorded run', () => {
        const recorder = new Replay();
        recorder.startRecording();
        const game = createGame('code');
        ['c', 'o', 'd', 'e'].forEach((l) => {
            guess(game, l);
            recorder.record(l);
        });
        const playbackGame = createGame('code');
        recorder.play((l) => {
            guess(playbackGame, l);
        });
        expect(playbackGame).toEqual(game);
    });
    test('can scrub to intermediate state', () => {
        const recorder = new Replay();
        recorder.startRecording();
        const game = createGame('code');
        ['c', 'o', 'd', 'e'].forEach((l) => {
            guess(game, l);
            recorder.record(l);
        });
        const partialGame = createGame('code');
        const secondEventTime = recorder.getEvents()[1].t;
        recorder.play((l) => guess(partialGame, l), secondEventTime);
        expect(partialGame.guessed).toEqual(['c', 'o']);
    });
});
