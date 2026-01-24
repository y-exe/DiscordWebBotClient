const assert = require('node:assert/strict');
const { test } = require('node:test');

const auth = require('../src/routes/auth');
const proxy = require('../src/routes/proxy');

const DEV_ORIGIN = 'http://localhost:5173';
const JSON_HEADERS = { Origin: DEV_ORIGIN, 'Content-Type': 'application/json' };

test('auth rejects disallowed origins', async () => {
    const res = await auth.request('/pending', {
        method: 'POST',
        headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'x' })
    });
    assert.equal(res.status, 403);
    assert.deepEqual(await res.json(), { error: 'Origin not allowed' });
});

test('auth rejects malformed credentials', async () => {
    const res = await auth.request('/pending', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ token: '   ' })
    });
    assert.equal(res.status, 400);
});

test('pending login round-trips through cookies', async () => {
    const put = await auth.request('/pending', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ token: 'sample-token', isBot: false })
    });
    assert.equal(put.status, 204);
    assert.equal(put.headers.get('cache-control'), 'no-store');
    const pendingPair = put.headers.getSetCookie().find((pair) => pair.startsWith('dwtc-pending='));
    assert.ok(pendingPair, 'pending cookie should be set');

    const commit = await auth.request('/accounts/0/commit', {
        method: 'POST',
        headers: { Origin: DEV_ORIGIN, Cookie: pendingPair.split(';')[0] }
    });
    assert.equal(commit.status, 204);
    const committed = commit.headers.getSetCookie();
    assert.ok(committed.some((pair) => pair.startsWith('dwtc-account-0=')));
    assert.ok(committed.some((pair) => pair.startsWith('dwtc-pending=') && /Max-Age=0/i.test(pair)));
});

test('image proxy rejects non-allowlisted hosts without network access', async () => {
    const res = await proxy.request(`/?url=${encodeURIComponent('https://example.com/x.png')}`);
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: 'Invalid image URL' });
});
