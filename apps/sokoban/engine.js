const key = (p) => `${p.x},${p.y}`;
export function loadLevel(lines) {
    const walls = new Set();
    const targets = new Set();
    const boxes = new Set();
    let player = { x: 0, y: 0 };
    lines.forEach((line, y) => {
        line.split('').forEach((ch, x) => {
            const k = key({ x, y });
            switch (ch) {
                case '#':
                    walls.add(k);
                    break;
                case '.':
                    targets.add(k);
                    break;
                case '$':
                    boxes.add(k);
                    break;
                case '*':
                    boxes.add(k);
                    targets.add(k);
                    break;
                case '@':
                    player = { x, y };
                    break;
                case '+':
                    player = { x, y };
                    targets.add(k);
                    break;
                default:
                    break;
            }
        });
    });
    const width = Math.max(...lines.map((l) => l.length));
    const height = lines.length;
    const state = {
        width,
        height,
        walls,
        targets,
        boxes,
        player,
        pushes: 0,
        moves: 0,
        history: [],
        deadlocks: new Set(),
    };
    state.deadlocks = computeDeadlocks(state);
    return state;
}
function cloneState(state) {
    return {
        player: { ...state.player },
        boxes: Array.from(state.boxes),
        pushes: state.pushes,
    };
}
const DIRS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
};
export const directionKeys = Object.keys(DIRS);
function isWallOrBox(state, pos) {
    const k = key(pos);
    if (pos.x < 0 || pos.y < 0 || pos.x >= state.width || pos.y >= state.height)
        return true;
    return state.walls.has(k) || state.boxes.has(k);
}
export function isDeadlockPosition(state, pos) {
    const k = key(pos);
    if (state.targets.has(k))
        return false;
    const up = isWallOrBox(state, { x: pos.x, y: pos.y - 1 });
    const down = isWallOrBox(state, { x: pos.x, y: pos.y + 1 });
    const left = isWallOrBox(state, { x: pos.x - 1, y: pos.y });
    const right = isWallOrBox(state, { x: pos.x + 1, y: pos.y });
    return (up && left) || (up && right) || (down && left) || (down && right);
}
function computeDeadlocks(state) {
    const d = new Set();
    state.boxes.forEach((b) => {
        const [x, y] = b.split(',').map(Number);
        const pos = { x, y };
        if (isDeadlockPosition(state, pos))
            d.add(b);
    });
    return d;
}
export function move(state, dirKey) {
    const dir = DIRS[dirKey];
    if (!dir)
        return state;
    const next = { x: state.player.x + dir.x, y: state.player.y + dir.y };
    const nextKey = key(next);
    if (state.walls.has(nextKey))
        return state;
    const result = { ...state, player: { ...state.player }, boxes: new Set(state.boxes), history: [...state.history] };
    result.history.push(cloneState(state));
    if (result.boxes.has(nextKey)) {
        const beyond = { x: next.x + dir.x, y: next.y + dir.y };
        const beyondKey = key(beyond);
        if (isWallOrBox(state, beyond)) {
            result.history.pop();
            return state;
        }
        result.boxes.delete(nextKey);
        result.boxes.add(beyondKey);
        result.pushes += 1;
    }
    result.player = next;
    result.moves += 1;
    result.deadlocks = computeDeadlocks(result);
    return result;
}
export function undo(state) {
    if (!state.history.length)
        return state;
    const prev = state.history[state.history.length - 1];
    const boxes = new Set(prev.boxes);
    const restored = {
        ...state,
        player: { ...prev.player },
        boxes,
        pushes: prev.pushes,
        moves: state.moves + 1,
        history: state.history.slice(0, -1),
    };
    restored.deadlocks = computeDeadlocks(restored);
    return restored;
}
export function reset(lines) {
    return loadLevel(lines);
}
export function reachable(state) {
    const visited = new Set();
    const q = [state.player];
    visited.add(key(state.player));
    while (q.length) {
        const p = q.shift();
        Object.values(DIRS).forEach((d) => {
            const n = { x: p.x + d.x, y: p.y + d.y };
            const k = key(n);
            if (visited.has(k) || isWallOrBox(state, n))
                return;
            if (state.boxes.has(k))
                return; // cannot walk through boxes
            visited.add(k);
            q.push(n);
        });
    }
    return visited;
}
export function isSolved(state) {
    let solved = true;
    state.boxes.forEach((b) => {
        if (!state.targets.has(b)) {
            solved = false;
        }
    });
    return solved;
}
function isEdgeDeadlock(state, boxes, pos) {
    const k = key(pos);
    if (state.targets.has(k))
        return false;
    const left = isWallOrBoxWith(state, boxes, { x: pos.x - 1, y: pos.y });
    const right = isWallOrBoxWith(state, boxes, { x: pos.x + 1, y: pos.y });
    if (left || right) {
        let hasTarget = false;
        for (let x = pos.x; x >= 0; x--) {
            const kk = `${x},${pos.y}`;
            if (state.walls.has(kk))
                break;
            if (state.targets.has(kk)) {
                hasTarget = true;
                break;
            }
        }
        for (let x = pos.x; x < state.width; x++) {
            const kk = `${x},${pos.y}`;
            if (state.walls.has(kk))
                break;
            if (state.targets.has(kk)) {
                hasTarget = true;
                break;
            }
        }
        if (!hasTarget)
            return true;
    }
    const up = isWallOrBoxWith(state, boxes, { x: pos.x, y: pos.y - 1 });
    const down = isWallOrBoxWith(state, boxes, { x: pos.x, y: pos.y + 1 });
    if (up || down) {
        let hasTarget = false;
        for (let y = pos.y; y >= 0; y--) {
            const kk = `${pos.x},${y}`;
            if (state.walls.has(kk))
                break;
            if (state.targets.has(kk)) {
                hasTarget = true;
                break;
            }
        }
        for (let y = pos.y; y < state.height; y++) {
            const kk = `${pos.x},${y}`;
            if (state.walls.has(kk))
                break;
            if (state.targets.has(kk)) {
                hasTarget = true;
                break;
            }
        }
        if (!hasTarget)
            return true;
    }
    return false;
}
export function wouldDeadlock(state, dirKey) {
    const dir = DIRS[dirKey];
    if (!dir)
        return false;
    const next = { x: state.player.x + dir.x, y: state.player.y + dir.y };
    const nextKey = key(next);
    if (!state.boxes.has(nextKey))
        return false;
    const beyond = { x: next.x + dir.x, y: next.y + dir.y };
    const beyondKey = key(beyond);
    if (isWallOrBox(state, beyond))
        return false;
    const newBoxes = new Set(state.boxes);
    newBoxes.delete(nextKey);
    newBoxes.add(beyondKey);
    return (isDeadlockWith(state, newBoxes, beyond) ||
        isEdgeDeadlock(state, newBoxes, beyond));
}
// -- Solver utilities -------------------------------------------------------
function isWallOrBoxWith(state, boxes, pos) {
    const k = key(pos);
    if (pos.x < 0 || pos.y < 0 || pos.x >= state.width || pos.y >= state.height)
        return true;
    return state.walls.has(k) || boxes.has(k);
}
function isDeadlockWith(state, boxes, pos) {
    const k = key(pos);
    if (state.targets.has(k))
        return false;
    const up = isWallOrBoxWith(state, boxes, { x: pos.x, y: pos.y - 1 });
    const down = isWallOrBoxWith(state, boxes, { x: pos.x, y: pos.y + 1 });
    const left = isWallOrBoxWith(state, boxes, { x: pos.x - 1, y: pos.y });
    const right = isWallOrBoxWith(state, boxes, { x: pos.x + 1, y: pos.y });
    return (up && left) || (up && right) || (down && left) || (down && right);
}
const serialize = (player, boxes) => {
    const b = Array.from(boxes).sort().join(';');
    return `${player.x},${player.y}|${b}`;
};
export function findHint(state) {
    const startBoxes = new Set(state.boxes);
    const startKey = serialize(state.player, startBoxes);
    const visited = new Set([startKey]);
    const q = [
        { player: { ...state.player }, boxes: startBoxes, path: [] },
    ];
    while (q.length) {
        const cur = q.shift();
        let solved = true;
        cur.boxes.forEach((b) => {
            if (!state.targets.has(b))
                solved = false;
        });
        if (solved)
            return cur.path[0] ?? null;
        for (const dirKey of directionKeys) {
            const dir = DIRS[dirKey];
            const nextPlayer = { x: cur.player.x + dir.x, y: cur.player.y + dir.y };
            const nextKey = key(nextPlayer);
            if (state.walls.has(nextKey))
                continue;
            const newBoxes = new Set(cur.boxes);
            if (newBoxes.has(nextKey)) {
                const beyond = { x: nextPlayer.x + dir.x, y: nextPlayer.y + dir.y };
                const beyondKey = key(beyond);
                if (state.walls.has(beyondKey) || newBoxes.has(beyondKey))
                    continue;
                newBoxes.delete(nextKey);
                newBoxes.add(beyondKey);
                if (isDeadlockWith(state, newBoxes, beyond))
                    continue;
            }
            const ser = serialize(nextPlayer, newBoxes);
            if (visited.has(ser))
                continue;
            visited.add(ser);
            q.push({ player: nextPlayer, boxes: newBoxes, path: [...cur.path, dirKey] });
        }
    }
    return null;
}
