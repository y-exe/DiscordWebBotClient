const { Hono } = require('hono');
const { setCookie, deleteCookie } = require('hono/cookie');
const {
    IS_PRODUCTION,
    isAllowedOrigin,
    ACCOUNT_COOKIE_COUNT,
    ACCOUNT_COOKIE_MAX_AGE,
    PENDING_COOKIE_MAX_AGE,
    accountCookieName,
    pendingCookieName
} = require('../config');
const {
    parseCookieHeader,
    encodeCredentialCookie,
    decodeCredentialCookie,
    parseAccountSlot,
    credentialFromBody,
    consumeLimit,
    clientAddress
} = require('../utils/helpers');

const auth = new Hono();

const JSON_BODY_LIMIT = 4 * 1024;
const authAttempts = new Map();

auth.use(async (c, next) => {
    if (!consumeLimit(authAttempts, clientAddress(c), 30, 60_000)) {
        return c.json({ error: 'Too many requests' }, 429);
    }
    if (!isAllowedOrigin(c.req.header('origin'))) {
        return c.json({ error: 'Origin not allowed' }, 403);
    }
    await next();
    c.header('Cache-Control', 'no-store');
});

const readJsonBody = async (c) => {
    const declared = Number(c.req.header('content-length') || 0);
    if (Number.isFinite(declared) && declared > JSON_BODY_LIMIT) return 'too-large';
    let raw = '';
    try {
        raw = await c.req.text();
    } catch {
        return null;
    }
    if (Buffer.byteLength(raw, 'utf8') > JSON_BODY_LIMIT) return 'too-large';
    if (!raw.trim()) return {};
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const setAuthCookie = (c, name, value, maxAgeMs) => {
    setCookie(c, name, value, {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'Strict',
        path: '/',
        maxAge: Math.floor(maxAgeMs / 1000)
    });
};

const clearAuthCookie = (c, name) => {
    deleteCookie(c, name, {
        secure: IS_PRODUCTION,
        sameSite: 'Strict',
        path: '/'
    });
};

const noContent = (c) => c.body(null, 204);

auth.post('/pending', async (c) => {
    const body = await readJsonBody(c);
    if (body === 'too-large') return c.json({ error: 'Payload too large' }, 413);
    const credential = credentialFromBody(body);
    if (!credential) return c.json({ error: 'Invalid credentials' }, 400);
    setAuthCookie(c, pendingCookieName, encodeCredentialCookie(credential.token, credential.isBot), PENDING_COOKIE_MAX_AGE);
    return noContent(c);
});

auth.delete('/pending', (c) => {
    clearAuthCookie(c, pendingCookieName);
    return noContent(c);
});

auth.post('/accounts/:slot', async (c) => {
    const slot = parseAccountSlot(c.req.param('slot'));
    const body = await readJsonBody(c);
    if (body === 'too-large') return c.json({ error: 'Payload too large' }, 413);
    const credential = credentialFromBody(body);
    if (slot === null || !credential) return c.json({ error: 'Invalid account' }, 400);
    setAuthCookie(c, accountCookieName(slot), encodeCredentialCookie(credential.token, credential.isBot), ACCOUNT_COOKIE_MAX_AGE);
    return noContent(c);
});

auth.post('/accounts/:slot/commit', (c) => {
    const slot = parseAccountSlot(c.req.param('slot'));
    const pendingValue = parseCookieHeader(c.req.header('cookie')).get(pendingCookieName);
    const credential = decodeCredentialCookie(pendingValue);
    if (slot === null || !credential) return c.json({ error: 'Pending login not found' }, 400);
    setAuthCookie(c, accountCookieName(slot), pendingValue, ACCOUNT_COOKIE_MAX_AGE);
    clearAuthCookie(c, pendingCookieName);
    return noContent(c);
});

auth.post('/accounts/:slot/refresh', (c) => {
    const slot = parseAccountSlot(c.req.param('slot'));
    const cookieName = slot === null ? null : accountCookieName(slot);
    const value = cookieName ? parseCookieHeader(c.req.header('cookie')).get(cookieName) : null;
    const credential = decodeCredentialCookie(value);
    if (slot === null || !credential) return c.json({ error: 'Saved account not found' }, 400);
    setAuthCookie(c, cookieName, value, ACCOUNT_COOKIE_MAX_AGE);
    return noContent(c);
});

auth.delete('/accounts/:slot', (c) => {
    const slot = parseAccountSlot(c.req.param('slot'));
    if (slot === null) return c.json({ error: 'Invalid account' }, 400);
    clearAuthCookie(c, accountCookieName(slot));
    return noContent(c);
});

auth.delete('/accounts', (c) => {
    for (let slot = 0; slot < ACCOUNT_COOKIE_COUNT; slot += 1) {
        clearAuthCookie(c, accountCookieName(slot));
    }
    clearAuthCookie(c, pendingCookieName);
    return noContent(c);
});

module.exports = auth;
