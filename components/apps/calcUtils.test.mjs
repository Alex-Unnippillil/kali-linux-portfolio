import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateExpression, navigateHistory } from './calcUtils.mjs';

test('evaluateExpression handles arithmetic and variables', () => {
    const vars = {};
    assert.equal(evaluateExpression('2+3', vars), 5);
    assert.equal(evaluateExpression('x=3', vars), 3);
    assert.equal(vars.x, 3);
    assert.equal(evaluateExpression('x*2', vars), 6);
});

test('navigateHistory navigates command history', () => {
    const history = ['a', 'b'];
    let res = navigateHistory(history, history.length - 1, 'up');
    assert.deepEqual(res, { cmd: 'b', index: 0 });
    res = navigateHistory(history, res.index, 'up');
    assert.deepEqual(res, { cmd: 'a', index: -1 });
    res = navigateHistory(history, res.index, 'down');
    assert.deepEqual(res, { cmd: 'a', index: 1 });
    res = navigateHistory(history, res.index, 'down');
    assert.deepEqual(res, { cmd: 'b', index: 2 });
    res = navigateHistory(history, res.index, 'down');
    assert.deepEqual(res, { cmd: null, index: 2 });
});
