const { sessions } = require('../../services/session');
const {
    isSnowflake,
    isPlainObject,
    cleanText,
    publicError,
    safeAck,
    parseAttachment
} = require('../../utils/helpers');

const getClient = (socket) => sessions.get(socket.id);

const authHeader = (client) => (client.user?.bot ? `Bot ${client.token}` : client.token);

const fail = (cb, message) => cb(publicError(message));

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * セッション単位の簡易キャッシュ。レート制限対策で同じREST結果を短時間再利用する。
 * cacheFor(client, 'key', ttlMs, () => promise) の形で使う。
 */
const cacheFor = (client, key, ttlMs, producer) => {
    if (!client) return producer();
    if (!client._apiCache) client._apiCache = new Map();
    const cache = client._apiCache;
    const now = Date.now();
    const entry = cache.get(key);
    if (entry && now < entry.expiresAt) return entry.promise;
    const promise = (async () => {
        try {
            const value = await producer();
            cache.set(key, { promise: Promise.resolve(value), expiresAt: now + ttlMs, value });
            return value;
        } catch (error) {
            // 失敗時は短いTTLで失敗を保持し、直前の成功値があればそれを返す
            if (entry && entry.value !== undefined) {
                cache.set(key, { promise: entry.promise, expiresAt: now + Math.min(ttlMs, 10_000), value: entry.value });
                return entry.value;
            }
            const failure = { promise: Promise.resolve(null), expiresAt: now + Math.min(ttlMs, 10_000), failed: true, error };
            failure.promise.catch(() => { });
            cache.set(key, failure);
            throw error;
        }
    })();
    return promise;
};

/**
 * Raw REST request with the session token. Uniform behaviour for user
 * tokens and bot tokens because discord.js manager signatures differ
 * between the selfbot fork (v13) and discord.js (v14).
 * 429 を受けたら Retry-After の間、セッション全体のRESTを抑制する。
 */
const apiRequest = async (client, path, { method = 'GET', body, query } = {}) => {
    const cooldownUntil = client?._rateLimitedUntil ?? 0;
    if (Date.now() < cooldownUntil) {
        const error = new Error(`rate limited (cooldown ${Math.ceil((cooldownUntil - Date.now()) / 1000)}s)`);
        error.rateLimited = true;
        throw error;
    }
    const qs = query ? `?${new URLSearchParams(query)}` : '';
    const response = await fetch(`${DISCORD_API}${path}${qs}`, {
        method,
        headers: {
            Authorization: authHeader(client),
            ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        redirect: 'error',
        signal: AbortSignal.timeout(15_000)
    });
    let data = null;
    if (response.status !== 204) {
        try { data = await response.json(); } catch { }
    }
    // 429時は Retry-After の間セッション全体のRESTを抑制(ペナルティの延長を防ぐ)
    if (response.status === 429 && client) {
        const retryAfter = Number(response.headers?.get?.('retry-after') ?? data?.retry_after ?? 5);
        const cooldown = Math.min(Math.max(Number.isFinite(retryAfter) ? retryAfter : 5, 1), 120) * 1000;
        client._rateLimitedUntil = Date.now() + cooldown;
        console.warn(`[REST] 429 rate limited: cooling down ${Math.round(cooldown / 1000)}s`);
    }
    return { ok: response.ok, status: response.status, data };
};

const ICON_MIME_RE = /^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=]+)$/;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Validate a dataURL image and return it trimmed, or null when invalid.
 */
const validateImage = (value, maxBytes = MAX_IMAGE_BYTES) => {
    if (typeof value !== 'string') return null;
    const match = ICON_MIME_RE.exec(value);
    if (!match) return null;
    const [, mime, base64] = match;
    if (base64.length > Math.ceil(maxBytes / 3) * 4 + 4) return null;
    const normalizedMime = mime === 'jpg' ? 'jpeg' : mime;
    return `data:image/${normalizedMime};base64,${base64}`;
};

const validateMessageContent = (content, maxLength) => {
    if (content === undefined || content === null) return '';
    if (typeof content !== 'string') return null;
    const cleaned = cleanText(content, maxLength);
    if (cleaned.length !== content.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').length) return null;
    return cleaned;
};

/**
 * Permission bitfield values can exceed Number.MAX_SAFE_INTEGER (管理者権限は2^54-1)。
 * JSON数値にすると精度落ちするため、必ず文字列として扱う。
 */
const bitfieldToString = (value) => {
    try {
        return BigInt(value ?? 0).toString();
    } catch {
        return '0';
    }
};

const formatPermissionOverwrites = (channel) => {
    try {
        return Array.from(channel.permissionOverwrites?.cache?.values() || []).map((overwrite) => ({
            id: overwrite.id,
            type: Number(overwrite.type) === 1 ? 'member' : 'role',
            allow: bitfieldToString(overwrite.allow),
            deny: bitfieldToString(overwrite.deny)
        }));
    } catch {
        return [];
    }
};

/**
 * Compact channel shape shared by realtime events and settings pages.
 */
const formatChannel = (channel, { detailed = false } = {}) => {
    if (!channel) return null;
    const type = typeof channel.type === 'string'
        ? ({ GUILD_TEXT: 0, DM: 1, GUILD_VOICE: 2, GROUP_DM: 3, GUILD_CATEGORY: 4, GUILD_ANNOUNCEMENT: 5, GUILD_STAGE_VOICE: 13, GUILD_FORUM: 15 })[channel.type] ?? channel.type
        : channel.type;
    const base = {
        id: channel.id,
        name: channel.name ?? null,
        type,
        parentId: channel.parentId ?? null,
        position: channel.rawPosition ?? 0,
        rateLimitPerUser: channel.rateLimitPerUser ?? 0,
        nsfw: Boolean(channel.nsfw),
        lastMessageTimestamp: channel.lastMessageId ? Number(BigInt(channel.lastMessageId) >> 22n) + 1420070400000 : 0
    };
    if (!detailed) return base;
    const isThread = typeof channel.isThread === 'function' ? channel.isThread() : [10, 11, 12].includes(type);
    return {
        ...base,
        topic: channel.topic ?? null,
        bitrate: channel.bitrate ?? null,
        userLimit: channel.userLimit ?? null,
        archived: isThread ? Boolean(channel.archived) : undefined,
        locked: isThread ? Boolean(channel.locked) : undefined,
        autoArchiveDuration: isThread ? channel.autoArchiveDuration ?? null : undefined,
        owner: (type === 3 || typeof channel.ownerId !== 'undefined') ? channel.ownerId ?? null : undefined,
        recipients: type === 3 ? Array.from(channel.recipients?.values?.() || []).map((r) => ({ id: r.id, username: r.username, displayName: r.displayName ?? r.globalName ?? r.username, avatar: r.displayAvatarURL ? r.displayAvatarURL({ format: 'png' }) : null })) : undefined,
        permissionOverwrites: formatPermissionOverwrites(channel)
    };
};

const formatRole = (role) => ({
    id: role.id,
    name: role.name,
    color: role.hexColor === '#000000' ? null : role.hexColor,
    position: role.position,
    permissions: bitfieldToString(role.permissions),
    hoist: Boolean(role.hoist),
    mentionable: Boolean(role.mentionable),
    managed: Boolean(role.managed),
    createdAt: role.createdTimestamp ?? null,
    memberCount: role.members?.cache?.size ?? null
});

const formatMember = (member) => ({
    id: member.id,
    user: {
        id: member.user?.id ?? member.id,
        username: member.user?.username ?? '',
        displayName: member.user?.globalName ?? member.user?.displayName ?? member.user?.username ?? '',
        bot: Boolean(member.user?.bot)
    },
    nickname: member.nickname ?? null,
    avatar: member.user?.displayAvatarURL ? member.user.displayAvatarURL({ format: 'png', size: 128 }) : null,
    roles: Array.from(member.roles?.cache?.keys?.() || []).filter((id) => id !== member.guild?.id),
    joinedAt: member.joinedTimestamp ?? null,
    timeout: member.communicationDisabledUntilTimestamp ?? null
});

const formatInvite = (invite) => ({
    code: invite.code,
    url: `https://discord.gg/${invite.code}`,
    channel: invite.channel ? { id: invite.channel.id, name: invite.channel.name } : null,
    inviter: invite.inviter ? { id: invite.inviter.id, username: invite.inviter.username } : null,
    uses: invite.uses ?? 0,
    maxUses: invite.maxUses ?? 0,
    maxAge: invite.maxAge ?? 0,
    temporary: Boolean(invite.temporary),
    createdAt: invite.createdTimestamp ?? null,
    expiresAt: invite.expiresTimestamp ?? null
});

const formatBan = (ban) => ({
    user: ban.user ? {
        id: ban.user.id,
        username: ban.user.username,
        tag: ban.user.tag,
        avatar: ban.user.displayAvatarURL ? ban.user.displayAvatarURL({ format: 'png', size: 128 }) : null
    } : null,
    reason: ban.reason ?? null
});

const formatAuditEntry = (entry) => ({
    id: entry.id,
    action: entry.action,
    actionType: entry.actionType,
    executor: entry.executor ? { id: entry.executor.id, username: entry.executor.username } : null,
    targetId: entry.targetId ?? entry.target?.id ?? null,
    target: entry.target?.username ? { id: entry.target.id, username: entry.target.username } : null,
    reason: entry.reason ?? null,
    changes: Array.isArray(entry.changes) ? entry.changes.map((change) => ({ key: change.key, old: change.old, new: change.new })) : [],
    createdAt: entry.createdTimestamp ?? null
});

const formatEmoji = (emoji) => ({
    id: emoji.id,
    name: emoji.name,
    animated: Boolean(emoji.animated),
    managed: Boolean(emoji.managed),
    url: emoji.url || `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48`,
    createdAt: emoji.createdTimestamp ?? null
});

module.exports = {
    getClient,
    authHeader,
    fail,
    apiRequest,
    cacheFor,
    validateImage,
    validateMessageContent,
    bitfieldToString,
    formatPermissionOverwrites,
    formatChannel,
    formatRole,
    formatMember,
    formatInvite,
    formatBan,
    formatAuditEntry,
    formatEmoji,
    isSnowflake,
    isPlainObject,
    cleanText,
    safeAck,
    parseAttachment
};
