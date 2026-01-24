const assert = require('node:assert/strict');
const { test } = require('node:test');
const { consumeLimit } = require('../src/utils/helpers');
const { parseAccountSlot, credentialFromBody } = require('../src/utils/helpers');

test('malformed credentials and empty account slots are rejected', () => {
    for (const value of [null, [], 'token', 1]) assert.equal(credentialFromBody(value), null);
    for (const value of [null, undefined, '', ' ', true, '0x1']) assert.equal(parseAccountSlot(value), null);
    assert.equal(parseAccountSlot('0'), 0);
    assert.equal(parseAccountSlot(4), 4);
    assert.deepEqual(credentialFromBody({ token: ' sample ', isBot: true }), { token: 'sample', isBot: true });
});

test('new addresses cannot grow the rate-limit map without a bound', () => {
    const map = new Map();
    const original = Date.now;
    let now = 1000;
    Date.now = () => now;
    try {
        for (let index = 0; index < 10_000; index++) assert.equal(consumeLimit(map, String(index), 2, 60_000), true);
        assert.equal(consumeLimit(map, 'overflow', 2, 60_000), false);
        assert.equal(map.size, 10_000);
        assert.equal(consumeLimit(map, '0', 2, 60_000), true);
        assert.equal(consumeLimit(map, '0', 2, 60_000), false);
        now += 60_000;
        assert.equal(consumeLimit(map, 'new', 2, 60_000), true);
        assert.equal(map.size, 1);
    } finally { Date.now = original; }
});
