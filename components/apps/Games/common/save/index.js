import { createStore, get, set, del, keys } from 'idb-keyval';
const getStore = (gameId) => createStore(`game:${gameId}`, 'saves');
export async function saveSlot(gameId, slot) {
    const store = getStore(gameId);
    await set(slot.name, slot.data, store);
}
export async function loadSlot(gameId, name) {
    const store = getStore(gameId);
    return get(name, store);
}
export async function deleteSlot(gameId, name) {
    const store = getStore(gameId);
    await del(name, store);
}
export async function listSlots(gameId) {
    const store = getStore(gameId);
    const allKeys = await keys(store);
    return allKeys;
}
export async function exportSaves(gameId) {
    const store = getStore(gameId);
    const allKeys = await keys(store);
    const saves = [];
    for (const key of allKeys) {
        const data = await get(key, store);
        saves.push({ name: key, data });
    }
    return saves;
}
export async function importSaves(gameId, saves) {
    const store = getStore(gameId);
    await Promise.all(saves.map((slot) => set(slot.name, slot.data, store)));
}
