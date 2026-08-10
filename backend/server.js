require('dotenv').config();
const http = require('http');
const express = require('express');
const dns = require('dns').promises;
const net = require('net');
const { Server } = require("socket.io");
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const { Client: SelfClient } = require('discord.js-selfbot-v13');
let BotClient, GatewayIntentBits, Partials;
try {
    const Discord = require('discord.js');
    BotClient = Discord.Client;
    GatewayIntentBits = Discord.GatewayIntentBits;
    Partials = Discord.Partials;
} catch (e) { }

const app = express();
app.disable('x-powered-by');

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

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            imgSrc: ["'self'", 'data:'],
            frameAncestors: ["'none'"],
            baseUri: ["'none'"],
        }
    }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '4kb' }));
const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions,
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
    maxHttpBufferSize: 30 * 1024 * 1024,
    perMessageDeflate: false,
    serveClient: false
});

const sessions = new Map();
const loginQueue = new Set();

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
const authCookieLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
const requireAllowedAuthOrigin = (req, res, next) => {
    if (!isAllowedOrigin(req.get('origin'))) return res.status(403).json({ error: 'Origin not allowed' });
    res.setHeader('Cache-Control', 'no-store');
    return next();
};

app.use('/api/auth', authCookieLimiter, requireAllowedAuthOrigin);

app.post('/api/auth/pending', (req, res) => {
    const credential = credentialFromBody(req.body);
    if (!credential) return res.status(400).json({ error: 'Invalid credentials' });
    res.cookie(pendingCookieName, encodeCredentialCookie(credential.token, credential.isBot), cookieOptions(PENDING_COOKIE_MAX_AGE));
    return res.status(204).end();
});

app.delete('/api/auth/pending', (req, res) => {
    res.clearCookie(pendingCookieName, clearCookieOptions);
    return res.status(204).end();
});

app.post('/api/auth/accounts/:slot', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    const credential = credentialFromBody(req.body);
    if (slot === null || !credential) return res.status(400).json({ error: 'Invalid account' });
    res.cookie(accountCookieName(slot), encodeCredentialCookie(credential.token, credential.isBot), cookieOptions(ACCOUNT_COOKIE_MAX_AGE));
    return res.status(204).end();
});

app.post('/api/auth/accounts/:slot/commit', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    const pendingValue = parseCookieHeader(req.headers.cookie).get(pendingCookieName);
    const credential = decodeCredentialCookie(pendingValue);
    if (slot === null || !credential) return res.status(400).json({ error: 'Pending login not found' });
    res.cookie(accountCookieName(slot), pendingValue, cookieOptions(ACCOUNT_COOKIE_MAX_AGE));
    res.clearCookie(pendingCookieName, clearCookieOptions);
    return res.status(204).end();
});

app.post('/api/auth/accounts/:slot/refresh', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    const cookieName = slot === null ? null : accountCookieName(slot);
    const value = cookieName ? parseCookieHeader(req.headers.cookie).get(cookieName) : null;
    const credential = decodeCredentialCookie(value);
    if (slot === null || !credential) return res.status(400).json({ error: 'Saved account not found' });
    res.cookie(cookieName, value, cookieOptions(ACCOUNT_COOKIE_MAX_AGE));
    return res.status(204).end();
});

app.delete('/api/auth/accounts/:slot', (req, res) => {
    const slot = parseAccountSlot(req.params.slot);
    if (slot === null) return res.status(400).json({ error: 'Invalid account' });
    res.clearCookie(accountCookieName(slot), clearCookieOptions);
    return res.status(204).end();
});

app.delete('/api/auth/accounts', (req, res) => {
    for (let slot = 0; slot < ACCOUNT_COOKIE_COUNT; slot += 1) {
        res.clearCookie(accountCookieName(slot), clearCookieOptions);
    }
    res.clearCookie(pendingCookieName, clearCookieOptions);
    return res.status(204).end();
});

const IMAGE_PROXY_HOSTS = new Set(
    (process.env.IMAGE_PROXY_HOSTS || 'cdn.discordapp.com,media.discordapp.net,images-ext-1.discordapp.net,images-ext-2.discordapp.net')
        .split(',').map((host) => host.trim().toLowerCase()).filter(Boolean)
);
const MAX_PROXY_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);
const imageProxyLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });

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

const validateProxyUrl = async (value) => {
    if (typeof value !== 'string' || value.length > 2048) throw new Error('invalid_url');
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('invalid_url');
    if (!IMAGE_PROXY_HOSTS.has(url.hostname.toLowerCase())) throw new Error('host_not_allowed');
    const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('unsafe_address');
    return url;
};

app.get('/api/image-proxy', imageProxyLimiter, async (req, res) => {
    try {
        const imageUrl = await validateProxyUrl(req.query.url);
        const response = await fetch(imageUrl, { redirect: 'error', signal: AbortSignal.timeout(5_000) });
        const contentType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
        const declaredSize = Number(response.headers.get('content-length') || 0);
        if (!response.ok || !ALLOWED_IMAGE_TYPES.has(contentType) || declaredSize > MAX_PROXY_BYTES || !response.body) {
            return res.status(502).json({ error: 'Image could not be fetched' });
        }

        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_PROXY_BYTES) {
                await reader.cancel();
                return res.status(413).json({ error: 'Image is too large' });
            }
            chunks.push(Buffer.from(value));
        }

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', String(size));
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(Buffer.concat(chunks, size));
    } catch (error) {
        const status = ['invalid_url', 'host_not_allowed', 'unsafe_address'].includes(error.message) ? 400 : 502;
        return res.status(status).json({ error: status === 400 ? 'Invalid image URL' : 'Image could not be fetched' });
    }
});

const snowflakeToTimestamp = (id) => Number(BigInt(id) >> 22n) + 1420070400000;
const SNOWFLAKE_RE = /^\d{16,22}$/;
const isSnowflake = (value) => typeof value === 'string' && SNOWFLAKE_RE.test(value);
const cleanText = (value, maxLength) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, maxLength) : '';
const publicError = (fallback = 'Request failed') => ({ ok: false, error: fallback });
const safeAck = (callback) => typeof callback === 'function' ? callback : () => {};
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const MAX_MESSAGE_LENGTH = 4000;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 20 * 1024 * 1024;
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
const COMMAND_NAME_RE = /^[\p{L}\p{N}_-]{1,32}$/u;

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

const discordFetch = (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'discord.com' || !parsed.pathname.startsWith('/api/')) {
        throw new Error('invalid_discord_url');
    }
    return fetch(parsed, { ...options, redirect: 'error', signal: AbortSignal.timeout(10_000) });
};

const connectionAttempts = new Map();
const consumeLimit = (store, key, limit, windowMs) => {
    const now = Date.now();
    const current = store.get(key);
    if (!current || current.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
};
const limitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of connectionAttempts) {
        if (value.resetAt <= now) connectionAttempts.delete(key);
    }
}, 60_000);
limitCleanupTimer.unref();

const getUserDisplayName = (user, member = null) => {
    if (member?.nickname) return member.nickname;
    if (member?.displayName && member.displayName !== user?.username) return member.displayName;
    return user?.globalName || user?.global_name || user?.displayName || user?.username || "Unknown User";
};

const getDirectDisplayName = (user) => user?.globalName || user?.global_name || user?.displayName || user?.username || "Unknown User";

const getUserAvatar = (user, options = { format: 'png' }) => {
    if (!user) return null;
    if (typeof user.displayAvatarURL === 'function') return user.displayAvatarURL(options);
    if (typeof user.avatarURL === 'function') return user.avatarURL(options);
    if (user.avatar && user.id) {
        const ext = String(user.avatar).startsWith('a_') && options.dynamic ? 'gif' : 'png';
        const size = options.size || 128;
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=${size}`;
    }
    return null;
};

const getStickerFormat = (sticker) => {
    const format = sticker?.format || sticker?.formatType || sticker?.format_type;
    if (format === 1 || format === 'PNG') return 'PNG';
    if (format === 2 || format === 'APNG') return 'APNG';
    if (format === 3 || format === 'LOTTIE') return 'LOTTIE';
    if (format === 4 || format === 'GIF') return 'GIF';
    return format || 'PNG';
};

const getStickerUrl = (sticker) => {
    if (!sticker?.id) return sticker?.url || null;
    const format = getStickerFormat(sticker);
    if (format === 'GIF') return `https://media.discordapp.net/stickers/${sticker.id}.gif`;
    if (format === 'LOTTIE') return `https://media.discordapp.net/stickers/${sticker.id}.json`;
    return sticker.url || `https://media.discordapp.net/stickers/${sticker.id}.png`;
};

const formatSticker = (sticker) => {
    if (!sticker) return null;
    const format = getStickerFormat(sticker);
    return {
        id: sticker.id,
        name: sticker.name || 'Sticker',
        description: sticker.description || '',
        format,
        url: getStickerUrl(sticker),
        guildId: sticker.guildId || sticker.guild_id || sticker.guild?.id || null,
        packId: sticker.packId || sticker.pack_id || null,
        tags: Array.isArray(sticker.tags) ? sticker.tags : String(sticker.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
    };
};

const getDMChannels = async (client) => {
    const dms = client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM' || c.type === 1 || c.type === 3);
    return Array.from(dms.values()).map(c => {
        const recipient = c.type === 'DM' || c.type === 1 ? c.recipient : null;
        return {
            id: c.id,
            name: c.type === 'GROUP_DM' || c.type === 3 ? (c.name || "グループDM") : getDirectDisplayName(recipient),
            avatar: getUserAvatar(recipient, { format: 'png' }),
            type: c.type,
            lastMessageId: c.lastMessageId,
            lastMessageTimestamp: c.lastMessageId ? snowflakeToTimestamp(c.lastMessageId) : 0
        };
    }).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
};

const getRelationshipEntries = (client) => {
    const cache = client.relationships?.cache;
    if (cache && typeof cache.entries === 'function') {
        return Array.from(cache.entries()).map(([id, type]) => ({
            id,
            type,
            nickname: client.relationships?.friendNicknames?.get?.(id) || null
        }));
    }
    return [];
};

const getFriends = async (client) => {
    let relationships = [];
    try {
        const apiRelationships = await client.api.users['@me'].relationships.get();
        if (Array.isArray(apiRelationships)) {
            relationships = apiRelationships;
            client.relationships?._setup?.(apiRelationships);
        }
    } catch (e) { }

    if (!relationships.length) relationships = getRelationshipEntries(client);

    const friendEntries = relationships.filter((entry) => {
        const type = entry.type ?? entry.relationshipType;
        return [1, 3, 4].includes(type) || ['FRIEND', 'friend', 'PENDING_INCOMING', 'PENDING_OUTGOING'].includes(type);
    });

    const users = [];
    for (const entry of friendEntries) {
        const userId = entry.user?.id || entry.userId || entry.userID || entry.id;
        const type = entry.type ?? entry.relationshipType;
        let user = entry.user || (userId ? client.users.cache.get(userId) : null);
        if (!user && userId) {
            try {
                user = await client.users.fetch(userId);
            } catch (e) { }
        }
        if (userId && !users.some((candidate) => candidate.user.id === userId)) {
            users.push({
                user: user || { id: userId, username: entry.nickname || "Unknown User" },
                relationshipType: [3, 4].includes(type) || String(type).includes('PENDING') ? 'pending' : 'friend'
            });
        }
    }

    return users.map(({ user, relationshipType }) => {
        const presence = user.presence || client.presence?.cache?.get?.(user.id) || client.presences?.cache?.get?.(user.id);
        const activity = presence?.activities?.find?.((item) => item.state || item.name);
        return {
            id: user.id,
            username: user.username,
            displayName: getDirectDisplayName(user),
            globalName: user.globalName || user.global_name || user.displayName,
            avatar: getUserAvatar(user, { dynamic: true, format: 'png' }),
            status: presence?.status || user.presence?.status || 'offline',
            activity: activity?.state || activity?.name || '',
            activityType: activity?.type || '',
            relationshipType
        };
    }).sort((a, b) => {
        const aOffline = ['offline', 'invisible'].includes(a.status) ? 1 : 0;
        const bOffline = ['offline', 'invisible'].includes(b.status) ? 1 : 0;
        if (aOffline !== bOffline) return aOffline - bOffline;
        return a.displayName.localeCompare(b.displayName, 'ja');
    });
};

const getChannelsWithMembers = (guild) => {
    if (!guild) return [];
    const cache = guild.channels.cache;
    const allCategories = cache.filter(c => c.type === 'GUILD_CATEGORY' || c.type === 4).sort((a, b) => a.rawPosition - b.rawPosition);
    const allThreads = cache.filter(c => c.isThread?.() || [10, 11, 12].includes(c.type));

    const mainChannels = cache.filter(c => !c.isThread?.() && c.type !== 'GUILD_CATEGORY' && c.type !== 4 && c.viewable)
        .sort((a, b) => {
            const isVoiceA = (a.type === 'GUILD_VOICE' || a.type === 'GUILD_STAGE_VOICE' || a.type === 2 || a.type === 13);
            const isVoiceB = (b.type === 'GUILD_VOICE' || b.type === 'GUILD_STAGE_VOICE' || b.type === 2 || b.type === 13);
            if (isVoiceA !== isVoiceB) return isVoiceA ? 1 : -1;
            return a.rawPosition - b.rawPosition;
        });

    const mapChannel = (c) => ({
        id: c.id, name: c.name, type: c.type,
        members: (c.type === 'GUILD_VOICE' || c.type === 'GUILD_STAGE_VOICE' || c.type === 2 || c.type === 13) ? c.members.map(m => ({
            id: m.id, username: m.displayName, avatar: m.user.displayAvatarURL({ format: 'png' })
        })) : [],
        threads: allThreads.filter(t => t.parentId === c.id).map(t => ({
            id: t.id, name: t.name, type: t.type, parentId: t.parentId,
            lastMessageTimestamp: t.lastMessageId ? snowflakeToTimestamp(t.lastMessageId) : t.createdTimestamp,
            messageCount: t.messageCount || 0
        })).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
    });

    const result = [];
    const uncategorized = { id: "uncategorized", name: null, channels: mainChannels.filter(c => !c.parentId).map(mapChannel) };
    if (uncategorized.channels.length > 0) result.push(uncategorized);
    allCategories.forEach(cat => {
        const catChannels = mainChannels.filter(c => c.parentId === cat.id).map(mapChannel);
        result.push({ id: cat.id, name: cat.name, channels: catChannels });
    });
    return result;
};

const formatMessage = (m, referencedMessage = null, rawMessage = null) => {
    if (!m || !m.author) return null;
    const referenced = referencedMessage ? formatMessage(referencedMessage) : null;
    const displayName = m.guild ? getUserDisplayName(m.author, m.member) : getDirectDisplayName(m.author);

    const formatComponent = (comp) => {
        if (!comp) return null;
        const base = { type: comp.type, custom_id: comp.custom_id || comp.customId, disabled: comp.disabled || false };
        switch (comp.type) {
            case 1:
                return { ...base, components: (comp.components || []).map(formatComponent).filter(Boolean) };
            case 2:
                return { ...base, style: comp.style, label: comp.label, emoji: comp.emoji, url: comp.url };
            case 3:
                return { ...base, placeholder: comp.placeholder, min_values: comp.min_values || comp.minValues, max_values: comp.max_values || comp.maxValues, options: (comp.options || []).map(o => ({ label: o.label, value: o.value, description: o.description, emoji: o.emoji, default: o.default })) };
            case 5:
            case 6:
            case 7:
            case 8:
                return { ...base, placeholder: comp.placeholder, min_values: comp.min_values || comp.minValues, max_values: comp.max_values || comp.maxValues };
            default:
                return null;
        }
    };

    const formatComponents = (components) => {
        if (!components || !components.length) return [];
        return components.map(formatComponent).filter(Boolean);
    };

    let components = [];
    // Try to get components from raw API data first, then from the message object
    const rawComponents = rawMessage?.components || m.components;
    if (rawComponents && rawComponents.length > 0) {
        components = formatComponents(rawComponents);
    }

    return {
        id: m.id, content: m.content, timestamp: m.createdTimestamp,
        author: {
            id: m.author.id, username: m.author.username,
            displayName,
            globalName: m.author.globalName || m.author.displayName,
            avatar: getUserAvatar(m.author, { format: 'png' }),
            color: m.member ? m.member.displayHexColor : null,
        },
        attachments: m.attachments.map(a => ({ url: a.url })),
        stickers: m.stickers ? m.stickers.map(formatSticker).filter(Boolean) : [],
        embeds: m.embeds,
        components,
        reactions: m.reactions.cache.filter(r => r.count > 0).map(r => ({
            emoji: { name: r.emoji.name, id: r.emoji.id, url: r.emoji.id ? `https://cdn.discordapp.com/emojis/${r.emoji.id}.png` : null },
            count: r.count, me: r.me
        })),
        channelId: m.channel.id,
        replyTo: m.reference?.messageId ? { id: m.reference.messageId, message: referenced } : null
    };
};

const formatMessageWithReference = async (m, rawMessage = null) => {
    if (!m) return null;
    let referencedMessage = null;
    if (m.reference?.messageId && typeof m.fetchReference === 'function') {
        try {
            referencedMessage = await m.fetchReference();
        } catch (e) { }
    }
    return formatMessage(m, referencedMessage, rawMessage);
};

const destroySession = (id) => {
    const client = sessions.get(id);
    if (client) {
        console.log(`[System] Clearing session: ${id}`);
        try { client.destroy(); } catch (e) { }
        sessions.delete(id);
    }
    loginQueue.delete(id);
};

io.use((socket, next) => {
    const address = socket.handshake.address || 'unknown';
    if (!consumeLimit(connectionAttempts, address, 30, 60_000)) return next(new Error('Too many connection attempts'));
    return next();
});

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    const eventLimits = new Map();
    const allowedEvents = new Set([
        'login', 'getGuilds', 'getChannels', 'getFriends', 'getGuildEmojis', 'getGuildStickers',
        'getGuildRoles', 'getMessages', 'sendMessage', 'getUserProfile', 'getUserInfo',
        'addReaction', 'removeReaction', 'getSlashCommands', 'sendSlashCommand', 'interaction'
    ]);
    socket.use(([event], next) => {
        if (!allowedEvents.has(event)) return next(new Error('Unknown event'));
        const isMutation = ['login', 'sendMessage', 'addReaction', 'removeReaction', 'sendSlashCommand', 'interaction'].includes(event);
        const isExpensiveRead = ['getUserProfile', 'getUserInfo', 'getSlashCommands'].includes(event);
        const limit = event === 'login' ? 5 : isExpensiveRead ? 20 : event === 'getMessages' ? 60 : isMutation ? 30 : 120;
        const windowMs = event === 'login' || isExpensiveRead || event === 'getMessages' ? 60_000 : isMutation ? 10_000 : 60_000;
        if (!consumeLimit(eventLimits, event, limit, windowMs)) return next(new Error('Rate limit exceeded'));
        return next();
    });
    socket.on('error', (error) => console.warn(`[Socket] ${socket.id}: ${error.message}`));

    socket.on('login', async (credentials = {}) => {
        const slot = parseAccountSlot(credentials.slot);
        const cookieName = credentials.pending === true ? pendingCookieName : (slot === null ? null : accountCookieName(slot));
        const credential = cookieName ? readCredentialCookie(socket.handshake.headers.cookie, cookieName) : null;
        if (!credential) {
            return socket.emit('login-error', 'Invalid credentials');
        }
        const { token, isBot } = credential;
        if (sessions.has(socket.id) || loginQueue.has(socket.id)) return;

        loginQueue.add(socket.id);
        console.log(`[Auth] Login attempt: ${isBot ? 'Bot' : 'User'}`);

        let client;
        if (isBot && BotClient) {
            client = new BotClient({
                intents: [1, 2, 8, 512, 32768, 16384],
                partials: [Partials.Message, Partials.Channel, Partials.Reaction]
            });
        } else {
            client = new SelfClient({ checkUpdate: false });
        }

        const handleReady = () => {
            loginQueue.delete(socket.id);
            if (sessions.has(socket.id)) return;

            console.log(`[Auth] Ready: ${client.user.tag}`);
            sessions.set(socket.id, client);
            socket.emit('login-success', {
                isBot: !!client.user.bot,
                user: {
                    id: client.user.id,
                    username: client.user.username,
                    displayName: getDirectDisplayName(client.user),
                    globalName: client.user.globalName || client.user.displayName,
                    avatar: getUserAvatar(client.user, { format: 'png' })
                }
            });

            client.on('messageCreate', async (m) => {
                if (m.channelId === socket.currentChannelId) {
                    let raw = null;
                    try {
                        const token = client.token;
                        const isBot = !!client.user?.bot;
                        const authHeader = isBot ? `Bot ${token}` : token;
                        const response = await discordFetch(`https://discord.com/api/v10/channels/${m.channelId}/messages?limit=100`, {
                            headers: { 'Authorization': authHeader }
                        });
                        if (response.ok) {
                            const msgs = await response.json();
                            if (Array.isArray(msgs)) {
                                raw = msgs.find(rm => rm.id === m.id) || null;
                                // If not found in batch, try again after a short delay
                                if (!raw) {
                                    await new Promise(r => setTimeout(r, 500));
                                    const retry = await discordFetch(`https://discord.com/api/v10/channels/${m.channelId}/messages?limit=100`, {
                                        headers: { 'Authorization': authHeader }
                                    });
                                    if (retry.ok) {
                                        const retryMsgs = await retry.json();
                                        if (Array.isArray(retryMsgs)) {
                                            raw = retryMsgs.find(rm => rm.id === m.id) || null;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) { }
                    const formatted = await formatMessageWithReference(m, raw);
                    socket.emit('newMessage', formatted);
                }
            });
            client.on('messageUpdate', async (old, m) => {
                if (m.channelId === socket.currentChannelId) {
                    let raw = null;
                    try {
                        const token = client.token;
                        const isBot = !!client.user?.bot;
                        const authHeader = isBot ? `Bot ${token}` : token;
                        const response = await discordFetch(`https://discord.com/api/v10/channels/${m.channelId}/messages?limit=100`, {
                            headers: { 'Authorization': authHeader }
                        });
                        if (response.ok) {
                            const msgs = await response.json();
                            if (Array.isArray(msgs)) {
                                raw = msgs.find(rm => rm.id === m.id) || null;
                            }
                        }
                    } catch (e) { }
                    const formatted = await formatMessageWithReference(m, raw);
                    socket.emit('messageUpdate', formatted);
                }
            });
            client.on('messageDelete', (m) => { if (m.channelId === socket.currentChannelId) socket.emit('messageDelete', { id: m.id }); });

            const handleReactionChange = async (reaction) => {
                if (reaction.message.channelId === socket.currentChannelId) {
                    try { const updatedMsg = await reaction.message.fetch(true); socket.emit('messageUpdate', await formatMessageWithReference(updatedMsg)); } catch (e) { }
                }
            };
            client.on('messageReactionAdd', handleReactionChange);
            client.on('messageReactionRemove', handleReactionChange);

            if (client.on) {
                client.on('interactionCreate', async (interaction) => {
                    try {
                        if (interaction.type === 5) {
                            socket.emit('modalSubmit', {
                                customId: interaction.customId,
                                components: interaction.fields?.components || [],
                                values: {}
                            });
                        }
                        if (interaction.type === 9) {
                            socket.emit('modalResponse', {
                                title: interaction.data?.title,
                                custom_id: interaction.data?.custom_id,
                                components: interaction.data?.components || []
                            });
                        }
                    } catch (e) { }
                });
            }
        };

        client.on('ready', handleReady);
        client.on('clientReady', handleReady);

        try {
            await client.login(token);
        } catch (e) {
            loginQueue.delete(socket.id);
            console.warn(`[Auth] Login failed: ${e.message}`);
            socket.emit('login-error', 'Login failed');
            try { client.destroy(); } catch { }
        }
    });

    socket.on('getGuilds', (cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        cb(client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ format: 'png' }),
            banner: g.bannerURL ? g.bannerURL({ dynamic: true, format: 'png', size: 1024 }) : null,
            acronym: g.name.replace(/\w+/g, n => n[0]).slice(0, 3).toUpperCase()
        })));
    });

    socket.on('getChannels', async (guildId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        if (guildId !== '@me' && !isSnowflake(guildId)) return cb([]);
        socket.currentGuildId = guildId;
        if (guildId === '@me') {
            try {
                const dms = await getDMChannels(client);
                return cb([{ id: "dms", name: "ダイレクトメッセージ", channels: dms }]);
            } catch (error) {
                console.warn('GetChannels Error:', error.message);
                return cb([]);
            }
        }
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        cb(getChannelsWithMembers(guild));
    });

    socket.on('getFriends', async (cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        try {
            cb(await getFriends(client));
        } catch (e) {
            console.error('GetFriends Error:', e);
            cb([]);
        }
    });

    socket.on('getGuildEmojis', (guildId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me' || !isSnowflake(guildId)) return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        cb(guild.emojis.cache.map((emoji) => ({
            id: emoji.id,
            name: emoji.name,
            animated: emoji.animated,
            url: emoji.url || `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48`
        })));
    });

    socket.on('getGuildStickers', async (guildId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me' || !isSnowflake(guildId)) return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        try {
            if (guild.stickers?.fetch) await guild.stickers.fetch();
        } catch (e) { }
        cb(guild.stickers?.cache?.map(formatSticker).filter(Boolean) || []);
    });

    socket.on('getGuildRoles', async (guildId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me' || !isSnowflake(guildId)) return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        try {
            if (guild.roles?.fetch) await guild.roles.fetch();
        } catch (e) { }
        cb(guild.roles?.cache?.map(r => ({
            id: r.id,
            name: r.name,
            color: r.hexColor,
            position: r.position
        })).filter(r => r.id !== guild.id) || []);
    });

    socket.on('getMessages', async (data, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        const channelId = typeof data === 'string' ? data : data?.channelId;
        const before = isPlainObject(data) ? data.before : null;
        if (!isSnowflake(channelId) || (before && !isSnowflake(before))) return cb([]);
        socket.currentChannelId = channelId;
        try {
            const ch = await client.channels.fetch(channelId);
            const fetchOptions = { limit: 50 };
            if (before) fetchOptions.before = before;
            const msgs = await ch.messages.fetch(fetchOptions);

            let rawMessages = {};
            try {
                const token = client.token;
                let apiUrl = `https://discord.com/api/v10/channels/${channelId}/messages?limit=50`;
                if (before) apiUrl += `&before=${before}`;
                const isBot = !!client.user?.bot;
                const authHeader = isBot ? `Bot ${token}` : token;
                const response = await discordFetch(apiUrl, {
                    headers: { 'Authorization': authHeader }
                });
                if (response.ok) {
                    const rawMsgs = await response.json();
                    if (Array.isArray(rawMsgs)) {
                        rawMsgs.forEach(rm => { rawMessages[rm.id] = rm; });
                    }
                }
            } catch (e) {
                console.error('Raw messages fetch error:', e.message);
            }

            const formatted = await Promise.all(Array.from(msgs.values()).reverse().map(m => {
                const raw = rawMessages[m.id] || null;
                return formatMessageWithReference(m, raw);
            }));
            cb(formatted.filter(m => m));
        } catch (e) { cb([]); }
    });

    socket.on('sendMessage', async (d, cb = () => { }) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        if (!isPlainObject(d) || !isSnowflake(d.channelId)) return cb(publicError('Invalid request'));
        try {
            const ch = await client.channels.fetch(d.channelId);
            if (!ch) return cb({ ok: false, error: 'Channel not found' });

            if (d.files !== undefined && !Array.isArray(d.files)) return cb(publicError('Invalid attachments'));
            if ((d.files?.length || 0) > MAX_FILES) return cb(publicError(`Up to ${MAX_FILES} files are allowed`));
            const files = (d.files || []).map(parseAttachment);
            if (files.reduce((sum, file) => sum + file.attachment.length, 0) > MAX_TOTAL_FILE_BYTES) {
                return cb(publicError('Attachments are too large'));
            }

            if (d.reply?.messageId && !isSnowflake(d.reply.messageId)) return cb(publicError('Invalid reply'));
            const replyOptions = d.reply?.messageId ? {
                reply: {
                    messageReference: d.reply.messageId,
                    failIfNotExists: false
                },
                allowedMentions: {
                    repliedUser: d.reply.mention !== false
                }
            } : {};
            if (d.content !== undefined && typeof d.content !== 'string') return cb(publicError('Invalid message'));
            if ((d.content || '').length > MAX_MESSAGE_LENGTH) return cb(publicError('Message is too long'));
            const content = cleanText(d.content || '', MAX_MESSAGE_LENGTH).trim();
            const stickers = Array.isArray(d.stickers) ? d.stickers.filter(isSnowflake).slice(0, 3) : [];
            const payload = { ...replyOptions };
            if (files.length > 0) payload.files = files;
            if (stickers.length > 0) payload.stickers = stickers;
            if (content) payload.content = content;
            if (!payload.content && !payload.files && !payload.stickers) return cb({ ok: false, error: 'Message is empty' });

            await ch.send(payload);
            return cb({ ok: true, files: files.length, stickers: stickers.length });
        } catch (e) {
            console.error('SendMessage Error:', e.message);
            cb(publicError(e.message === 'invalid_attachment' ? 'Invalid attachment' : 'Message could not be sent'));
        }
    });

    socket.on('getUserProfile', async (payload = {}, cb = () => {}) => {
        cb = safeAck(cb);
        const { userId, guildId } = isPlainObject(payload) ? payload : {};
        const client = sessions.get(socket.id);
        if (!client) return cb({ error: 'Not logged in' });
        if (!isSnowflake(userId) || (guildId && guildId !== '@me' && !isSnowflake(guildId))) return cb({ error: 'Invalid request' });

        try {
            let user = client.users.cache.get(userId);
            if (!user) {
                user = await Promise.race([
                    client.users.fetch(userId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('User lookup timed out')), 4000))
                ]);
            }

            const guild = guildId && guildId !== '@me' ? client.guilds.cache.get(guildId) : null;
            let member = guild?.members?.cache?.get(userId) || null;
            if (guild && !member) {
                try {
                    member = await Promise.race([
                        guild.members.fetch(userId),
                        new Promise((resolve) => setTimeout(() => resolve(null), 3000))
                    ]);
                } catch { }
            }

            let apiProfile = null;
            try {
                apiProfile = await Promise.race([
                    client.api.users(userId).profile.get({ query: { with_mutual_guilds: false, with_mutual_friends_count: false } }),
                    new Promise((resolve) => setTimeout(() => resolve(null), 3500))
                ]);
            } catch { }

            const profileUser = apiProfile?.user || user;
            const profileData = apiProfile?.user_profile || apiProfile?.userProfile || {};
            const guildProfile = apiProfile?.guild_member_profile || apiProfile?.guildMemberProfile || {};
            const presence = member?.presence || user.presence || client.presence?.cache?.get?.(userId) || client.presences?.cache?.get?.(userId);
            const bannerHash = profileData.banner || profileUser?.banner;
            const banner = bannerHash
                ? `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${String(bannerHash).startsWith('a_') ? 'gif' : 'png'}?size=1024`
                : (typeof user.bannerURL === 'function' ? user.bannerURL({ dynamic: true, size: 1024 }) : null);

            cb({
                id: user.id,
                username: user.username,
                globalName: user.globalName || user.global_name || profileUser?.global_name,
                displayName: getUserDisplayName(user, member),
                avatar: member?.avatarURL?.({ dynamic: true, size: 512 }) || getUserAvatar(user, { dynamic: true, format: 'png', size: 512 }),
                banner,
                accentColor: profileData.accent_color || profileData.accentColor || user.hexAccentColor || null,
                bio: guildProfile.bio || profileData.bio || '',
                pronouns: guildProfile.pronouns || profileData.pronouns || '',
                status: presence?.status || 'offline',
                createdAt: user.createdTimestamp || snowflakeToTimestamp(user.id),
                joinedAt: member?.joinedTimestamp || null,
                bot: Boolean(user.bot),
                roles: member?.roles?.cache
                    ? member.roles.cache
                        .filter((role) => role.id !== guild?.id)
                        .sort((a, b) => b.position - a.position)
                        .map((role) => ({ id: role.id, name: role.name, color: role.hexColor }))
                    : []
            });
        } catch (e) {
            console.warn('GetUserProfile Error:', e.message);
            cb({ error: 'Failed to load profile' });
        }
    });

    socket.on('getUserInfo', async (userId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ error: 'Not logged in' });
        if (!isSnowflake(userId)) return cb({ error: 'Invalid request' });

        try {
            const user = await client.users.fetch(userId, { force: true });

            let profileData = {};
            if (typeof user.fetchProfile === 'function') {
                try {
                    const profile = await user.fetchProfile();
                    profileData = {
                        bio: profile.bio,
                        pronouns: profile.pronouns,
                        premiumSince: profile.premiumSinceTimestamp,
                        premiumType: profile.premiumType,
                        themeColors: profile.themeColors
                    };
                } catch (e) { }
            }


            let serverProfiles = [];
            for (const guild of client.guilds.cache.values()) {
                const member = guild.members?.cache?.get(userId);
                if (member) {
                    serverProfiles.push({
                        guildId: guild.id,
                        guildName: guild.name,
                        nickname: member.nickname,
                        displayName: member.displayName,
                        roles: member.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
                        joinedAt: member.joinedTimestamp,
                        premiumSince: member.premiumSinceTimestamp,
                        guildAvatarURL: member.avatarURL ? member.avatarURL({ dynamic: true, size: 1024 }) : null,
                        communicationDisabledUntil: member.communicationDisabledUntilTimestamp
                    });
                }
            }

            const data = {
                id: user.id,
                username: user.username,
                globalName: user.globalName,
                discriminator: user.discriminator,
                tag: user.tag,
                avatarURL: user.displayAvatarURL({ dynamic: true, format: 'png', size: 1024 }),
                bannerURL: user.bannerURL ? user.bannerURL({ dynamic: true, format: 'png', size: 1024 }) : null,
                accentColor: user.hexAccentColor,
                bot: user.bot,
                system: user.system,
                flags: user.flags ? user.flags.toArray() : [],
                createdAt: user.createdTimestamp,
                ...profileData,
                serverProfiles
            };
            cb(data);
        } catch (e) {
            console.warn('GetUserInfo Error:', e.message);
            cb({ error: 'Failed to load profile' });
        }
    });

    socket.on('addReaction', async (data, cb = () => {}) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId) || typeof data.emoji !== 'string' || !data.emoji || data.emoji.length > 128) {
            return cb(publicError('Invalid request'));
        }
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;
            const emojiParam = encodeURIComponent(data.emoji);
            const response = await discordFetch(
                `https://discord.com/api/v10/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}/@me`,
                { method: 'PUT', headers: { 'Authorization': authHeader } }
            );
            cb({ ok: response.ok || response.status === 204 });
        } catch (e) {
            console.error('AddReaction Error:', e.message);
            cb(publicError('Reaction could not be added'));
        }
    });

    socket.on('removeReaction', async (data, cb = () => {}) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId) || typeof data.emoji !== 'string' || !data.emoji || data.emoji.length > 128) {
            return cb(publicError('Invalid request'));
        }
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;
            const emojiParam = encodeURIComponent(data.emoji);
            const response = await discordFetch(
                `https://discord.com/api/v10/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}/@me`,
                { method: 'DELETE', headers: { 'Authorization': authHeader } }
            );
            cb({ ok: response.ok || response.status === 204 });
        } catch (e) {
            console.error('RemoveReaction Error:', e.message);
            cb(publicError('Reaction could not be removed'));
        }
    });

    socket.on('disconnect', () => {
        destroySession(socket.id);
    });

    socket.on('getSlashCommands', async (guildId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        if (guildId !== '@me' && !isSnowflake(guildId)) return cb([]);
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;

            let commands = [];
            try {
                let apiUrl;
                if (guildId && guildId !== '@me') {
                    apiUrl = `https://discord.com/api/v10/guilds/${guildId}/application-command-index`;
                } else {
                    apiUrl = `https://discord.com/api/v10/users/@me/applications`;
                }
                const response = await discordFetch(apiUrl, { headers: { 'Authorization': authHeader } });
                if (response.ok) {
                    const data = await response.json();
                    if (data.applications) {
                        for (const app of data.applications) {
                            if (app.id) {
                                try {
                                    if (!isSnowflake(app.id) || !isSnowflake(guildId)) continue;
                                    const cmdsResponse = await discordFetch(`https://discord.com/api/v10/applications/${app.id}/guilds/${guildId}/commands`, { headers: { 'Authorization': authHeader } });
                                    if (cmdsResponse.ok) {
                                        const cmds = await cmdsResponse.json();
                                        if (Array.isArray(cmds)) {
                                            commands.push(...cmds.map(cmd => ({
                                                id: cmd.id,
                                                name: cmd.name,
                                                description: cmd.description || '',
                                                type: cmd.type,
                                                application_name: app.name || app.bot?.username || '',
                                                options: (cmd.options || []).map(opt => ({
                                                    name: opt.name,
                                                    description: opt.description || '',
                                                    type: opt.type,
                                                    required: opt.required || false,
                                                    choices: opt.choices || []
                                                }))
                                            })));
                                        }
                                    }
                                } catch (e) { }
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('GetSlashCommands REST error:', e.message);
            }

            if (commands.length === 0) {
                try {
                    let jsCommands;
                    if (guildId && guildId !== '@me') {
                        jsCommands = await client.application?.commands?.fetch({ guildId });
                    } else {
                        jsCommands = await client.application?.commands?.fetch();
                    }
                    if (jsCommands) {
                        const list = (jsCommands instanceof Map ? Array.from(jsCommands.values()) : Array.isArray(jsCommands) ? jsCommands : []);
                        commands = list.map(cmd => ({
                            id: cmd.id,
                            name: cmd.name,
                            description: cmd.description || '',
                            type: cmd.type,
                            options: (cmd.options || []).map(opt => ({
                                name: opt.name,
                                description: opt.description || '',
                                type: opt.type,
                                required: opt.required || false,
                                choices: opt.choices || []
                            }))
                        }));
                    }
                } catch (e) { }
            }

            cb(commands);
        } catch (e) {
            console.error('GetSlashCommands Error:', e.message);
            cb([]);
        }
    });

    socket.on('sendSlashCommand', async (data, cb = () => {}) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.commandId) || !COMMAND_NAME_RE.test(data.commandName || '') || (data.guildId && data.guildId !== '@me' && !isSnowflake(data.guildId))) {
            return cb(publicError('Invalid request'));
        }
        try {
            const ch = await client.channels.fetch(data.channelId);
            if (!ch) return cb({ ok: false, error: 'Channel not found' });

            const options = (data.options || []).map(opt => {
                if (opt.type === 1 || opt.type === 'SUB_COMMAND') {
                    return { name: opt.name, type: 1, options: (opt.options || []).map(o => ({ name: o.name, value: o.value, type: o.type || 3 })) };
                }
                return { name: opt.name, value: opt.value, type: opt.type || 3 };
            });

            if (client.user.bot) {
                const interaction = await ch.client.application.commands.fetch(data.commandId, { guildId: data.guildId });
                await ch.send({ content: `</${data.commandName}:${data.commandId}>` });
                return cb({ ok: true });
            } else {
                await ch.send(`</${data.commandName}:${data.commandId}>`);
                return cb({ ok: true });
            }
        } catch (e) {
            console.error('SendSlashCommand Error:', e.message);
            cb(publicError('Command could not be sent'));
        }
    });

    socket.on('interaction', async (data, cb = () => {}) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        if (!isPlainObject(data) || !['modal', 'button', 'select'].includes(data.type) || !isSnowflake(data.channelId) || (data.guildId && data.guildId !== '@me' && !isSnowflake(data.guildId))) {
            return cb(publicError('Invalid request'));
        }
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;

            if (data.type === 'modal') {
                if ((data.applicationId && !isSnowflake(data.applicationId)) || typeof data.customId !== 'string' || data.customId.length > 100 || !isPlainObject(data.values) || Object.keys(data.values).length > 25) {
                    return cb(publicError('Invalid interaction'));
                }
                const modalValues = Object.entries(data.values);
                if (modalValues.some(([id, value]) => id.length > 100 || typeof value !== 'string' || value.length > 4000)) {
                    return cb(publicError('Invalid interaction'));
                }
                const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                const body = {
                    type: 6,
                    application_id: data.applicationId || '0',
                    channel_id: data.channelId,
                    guild_id: data.guildId,
                    session_id: sessionId,
                    data: {
                        custom_id: data.customId,
                        components: modalValues.map(([id, value]) => ({
                            type: 1,
                            components: [{ type: 4, custom_id: id, value }]
                        }))
                    }
                };

                const response = await discordFetch(`https://discord.com/api/v10/interactions`, {
                    method: 'POST',
                    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                return cb({ ok: response.ok || response.status === 204 });
            }

            if (!isSnowflake(data.messageId) || typeof data.customId !== 'string' || !data.customId || data.customId.length > 100) {
                return cb(publicError('Invalid interaction'));
            }
            if (data.values !== undefined && (!Array.isArray(data.values) || data.values.length > 25 || data.values.some((value) => typeof value !== 'string' || value.length > 100))) {
                return cb(publicError('Invalid interaction'));
            }

            let applicationId = null;
            try {
                const msgResponse = await discordFetch(`https://discord.com/api/v10/channels/${data.channelId}/messages?limit=50`, {
                    headers: { 'Authorization': authHeader }
                });
                if (msgResponse.ok) {
                    const msgs = await msgResponse.json();
                    if (Array.isArray(msgs)) {
                        const msg = msgs.find(m => m.id === data.messageId);
                        if (msg) {
                            applicationId = msg.application_id || msg.author?.id;
                        }
                    }
                }
            } catch (e) { }

            if (!applicationId) {
                return cb({ ok: false, error: 'Could not find application ID' });
            }

            const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const body = {
                type: 3,
                application_id: applicationId,
                channel_id: data.channelId,
                message_id: data.messageId,
                guild_id: data.guildId,
                session_id: sessionId,
                data: {
                    custom_id: data.customId,
                    component_type: data.type === 'button' ? 2 : 3,
                    values: data.values || []
                }
            };

            const interactionResponse = await discordFetch(`https://discord.com/api/v10/interactions`, {
                method: 'POST',
                headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (interactionResponse.ok) {
                try {
                    const responseData = await interactionResponse.json();
                    if (responseData.type === 9 && responseData.data) {
                        return cb({ ok: true, modal: responseData.data });
                    }
                } catch (e) {
                }
                return cb({ ok: true });
            }

            if (interactionResponse.status === 204) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                return cb({ ok: true, deferred: true });
            }

            console.error('Interaction Error Response:', interactionResponse.status);
            return cb(publicError('Interaction failed'));
        } catch (e) {
            console.error('Interaction Error:', e.message);
            cb(publicError('Interaction failed'));
        }
    });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, req, res, next) => {
    console.error('HTTP Error:', error.message);
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: 'Internal server error' });
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
const port = Number.parseInt(process.env.PORT || '8000', 10);
server.listen(port, '0.0.0.0', () => console.log(`Backend Online: ${port}`));
