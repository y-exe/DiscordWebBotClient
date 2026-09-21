require('dotenv').config();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = new Set(
    (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean)
);
if (!IS_PRODUCTION) {
    ALLOWED_ORIGINS.add('http://localhost:5173');
    ALLOWED_ORIGINS.add('http://127.0.0.1:5173');
}

const isAllowedOrigin = (origin) => {
    if (!origin) return !IS_PRODUCTION || process.env.ALLOW_NO_ORIGIN === 'true';
    try { return ALLOWED_ORIGINS.has(new URL(origin).origin); } catch { return false; }
};

const corsOptions = {
    origin(origin, callback) { callback(null, isAllowedOrigin(origin)); },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400
};

const ACCOUNT_COOKIE_COUNT = 5;
const ACCOUNT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60 * 1000;
const PENDING_COOKIE_MAX_AGE = 10 * 60 * 1000;
const cookiePrefix = IS_PRODUCTION ? '__Host-dwtc-' : 'dwtc-';
const accountCookieName = (slot) => `${cookiePrefix}account-${slot}`;
const pendingCookieName = `${cookiePrefix}pending`;

const cookieOptions = (maxAge) => ({
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    path: '/',
    maxAge,
});

const clearCookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    path: '/',
};

const IMAGE_PROXY_HOSTS = new Set(
    (process.env.IMAGE_PROXY_HOSTS || 'cdn.discordapp.com,media.discordapp.net,images-ext-1.discordapp.net,images-ext-2.discordapp.net')
        .split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
);
const MAX_PROXY_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);
const MAX_IMAGE_CACHE_BYTES = 128 * 1024 * 1024;

const MAX_MESSAGE_LENGTH = 4000;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
const COMMAND_NAME_RE = /^[\p{L}\p{N}_-]{1,32}$/u;
const SNOWFLAKE_RE = /^\d{16,22}$/;

module.exports = {
    IS_PRODUCTION,
    ALLOWED_ORIGINS,
    isAllowedOrigin,
    corsOptions,
    ACCOUNT_COOKIE_COUNT,
    ACCOUNT_COOKIE_MAX_AGE,
    PENDING_COOKIE_MAX_AGE,
    cookiePrefix,
    accountCookieName,
    pendingCookieName,
    cookieOptions,
    clearCookieOptions,
    IMAGE_PROXY_HOSTS,
    MAX_PROXY_BYTES,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_CACHE_BYTES,
    MAX_MESSAGE_LENGTH,
    MAX_FILES,
    MAX_FILE_BYTES,
    MAX_TOTAL_FILE_BYTES,
    BASE64_RE,
    COMMAND_NAME_RE,
    SNOWFLAKE_RE
};
