const net = require('net');
const {
    ACCOUNT_COOKIE_COUNT,
    MAX_MESSAGE_LENGTH,
    MAX_FILES,
    MAX_FILE_BYTES,
    BASE64_RE,
    SNOWFLAKE_RE
} = require('../config');

const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + 1420070400000;
const isSnowflake = (value) => typeof value === 'string' && SNOWFLAKE_RE.test(value);
const cleanText = (value, maxLength) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, maxLength) : '';
const publicError = (fallback = 'Request failed') => ({ ok: false, error: fallback });
const safeAck = (callback) => typeof callback === 'function' ? callback : () => {};
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const consumeLimit = (map, key, limit, windowMs) => {
    const now = Date.now();
    const entry = map.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    map.set(key, entry);
    return entry.count <= limit;
};

const parseCookieHeader = (header = '') => {
    const cookies = new Map();
    for (const part of header.split(';')) {
        const separator = part.indexOf('=');
        if (separator < 1) continue;
        const name = part.slice(0, separator).trim();
        const rawValue = part.slice(separator + 1).trim();
        try { cookies.set(name, decodeURIComponent(rawValue)); } catch { }
    }
    return cookies;
};

const encodeCredentialCookie = (token, isBot) => Buffer
    .from(JSON.stringify({ token, isBot: isBot === true }), 'utf8')
    .toString('base64url');

const decodeCredentialCookie = (value) => {
    if (typeof value !== 'string' || value.length > 1024) return null;
    try {
        const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
        const token = typeof parsed.token === 'string' ? parsed.token.trim() : '';
        if (!token || token.length > 512 || /[\r\n\0]/.test(token)) return null;
        return { token, isBot: parsed.isBot === true };
    } catch {
        return null;
    }
};

const readCredentialCookie = (header, name) => decodeCredentialCookie(parseCookieHeader(header).get(name));

const parseAccountSlot = (value) => {
    const slot = Number(value);
    return Number.isInteger(slot) && slot >= 0 && slot < ACCOUNT_COOKIE_COUNT ? slot : null;
};

const credentialFromBody = (body = {}) => {
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token || token.length > 512 || /[\r\n\0]/.test(token)) return null;
    return { token, isBot: body.isBot === true };
};

const parseAttachment = (file) => {
    if (!isPlainObject(file)) throw new Error('invalid_attachment');
    const rawData = typeof file.data === 'string' ? file.data : '';
    const commaIndex = rawData.indexOf(',');
    const base64 = commaIndex >= 0 ? rawData.slice(commaIndex + 1) : rawData;
    if (!base64 || base64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 4 || !BASE64_RE.test(base64)) {
        throw new Error('invalid_attachment');
    }
    const attachment = Buffer.from(base64, 'base64');
    if (!attachment.length || attachment.length > MAX_FILE_BYTES) throw new Error('invalid_attachment');
    if (Number.isFinite(file.size) && Number(file.size) !== attachment.length) throw new Error('invalid_attachment');
    const name = cleanText(file.name, 128).replace(/[\\/:*?"<>|]/g, '_').trim() || 'attachment';
    return { attachment, name, description: name };
};

const isPrivateAddress = (address) => {
    if (net.isIPv4(address)) {
        const [a, b] = address.split('.').map(Number);
        return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
    }
    if (net.isIPv6(address)) {
        const normalized = address.toLowerCase();
        const mappedV4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
        if (mappedV4) return isPrivateAddress(mappedV4);
        return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff');
    }
    return true;
};

const discordFetch = (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'discord.com' || !parsed.pathname.startsWith('/api/')) {
        throw new Error('invalid_discord_url');
    }
    return fetch(parsed, {
        ...options,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000)
    });
};

module.exports = {
    snowflakeToTimestamp,
    isSnowflake,
    cleanText,
    publicError,
    safeAck,
    isPlainObject,
    consumeLimit,
    parseCookieHeader,
    encodeCredentialCookie,
    decodeCredentialCookie,
    readCredentialCookie,
    parseAccountSlot,
    credentialFromBody,
    parseAttachment,
    isPrivateAddress,
    discordFetch
};
