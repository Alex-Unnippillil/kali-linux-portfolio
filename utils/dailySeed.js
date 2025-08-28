import { getSeed, setSeed } from './idb';
function today() {
    return new Date().toISOString().split('T')[0];
}
export async function getDailySeed(game) {
    const date = today();
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel();
        const sw = navigator.serviceWorker.controller;
        return new Promise((resolve) => {
            channel.port1.onmessage = (event) => {
                resolve(event.data.seed);
            };
            sw.postMessage({ type: 'seed', game, date }, [channel.port2]);
        });
    }
    let seed = await getSeed(game, date);
    if (!seed) {
        seed = Math.random().toString(36).slice(2, 10);
        await setSeed(game, date, seed);
    }
    return seed;
}
export { today as currentDateString };
