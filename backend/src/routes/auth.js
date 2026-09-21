const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
    isAllowedOrigin,
    ACCOUNT_COOKIE_COUNT,
    ACCOUNT_COOKIE_MAX_AGE,
    PENDING_COOKIE_MAX_AGE,
    accountCookieName,
    pendingCookieName,
    cookieOptions,
    clearCookieOptions
} = require('../config');
const {
    parseCookieHeader,
    encodeCredentialCookie,
    decodeCredentialCookie,
    parseAccountSlot,
    credentialFromBody
} = require('../utils/helpers');

const router = express.Router();

const authCookieLimiter = rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false
});

const requireAllowedAuthOrigin = (req, res, next) => {
    if (!isAllowedOrigin(req.get('origin'))) return res.status(403).json({ error: 'Origin not allowed' });
    res.setHeader('Cache-Control', 'no-store');
    return next();
};

router.use(authCookieLimiter, requireAllowedAuthOrigin);

router.post('/pending', (req, res) => {
    const credential = credentialFromBody(req.body);
    if (!credential) return res.status(400).json({ error: 'Invalid credentials' });
    res.cookie(pendingCookieName, encodeCredentialCookie(credential.token, credential.isBot), cookieOptions(PENDING_COOKIE_MAX_AGE));
    return res.status(204).end();
});

router.delete('/pending', (req, res) => {
    res.clearCookie(pendingCookieName, clearCookieOptions);
    return res.status(204).end();
});

router.post('/accounts/:slot', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    const credential = credentialFromBody(req.body);
    if (slot === null || !credential) return res.status(400).json({ error: 'Invalid account' });
    res.cookie(accountCookieName(slot), encodeCredentialCookie(credential.token, credential.isBot), cookieOptions(ACCOUNT_COOKIE_MAX_AGE));
    return res.status(204).end();
});

router.post('/accounts/:slot/commit', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    const pendingValue = parseCookieHeader(req.headers.cookie).get(pendingCookieName);
    const credential = decodeCredentialCookie(pendingValue);
    if (slot === null || !credential) return res.status(400).json({ error: 'Pending login not found' });
    res.cookie(accountCookieName(slot), pendingValue, cookieOptions(ACCOUNT_COOKIE_MAX_AGE));
    res.clearCookie(pendingCookieName, clearCookieOptions);
    return res.status(204).end();
});

router.post('/accounts/:slot/refresh', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    const cookieName = slot === null ? null : accountCookieName(slot);
    const value = cookieName ? parseCookieHeader(req.headers.cookie).get(cookieName) : null;
    const credential = decodeCredentialCookie(value);
    if (slot === null || !credential) return res.status(400).json({ error: 'Saved account not found' });
    res.cookie(cookieName, value, cookieOptions(ACCOUNT_COOKIE_MAX_AGE));
    return res.status(204).end();
});

router.delete('/accounts/:slot', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    if (slot === null) return res.status(400).json({ error: 'Invalid account' });
    res.clearCookie(accountCookieName(slot), clearCookieOptions);
    return res.status(204).end();
});

router.delete('/accounts', (req, res) => {
    for (let slot = 0; slot < ACCOUNT_COOKIE_COUNT; slot += 1) {
        res.clearCookie(accountCookieName(slot), clearCookieOptions);
    }
    res.clearCookie(pendingCookieName, clearCookieOptions);
    return res.status(204).end();
});

module.exports = router;
