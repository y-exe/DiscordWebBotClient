const {
    getClient,
    fail,
    apiRequest,
    validateImage,
    formatChannel,
    isSnowflake,
    isPlainObject,
    cleanText,
    safeAck
} = require('./common');

const CHANNEL_NAME_MAX = 100;
const TOPIC_MAX = 1024;
const SLOWMODE_MAX = 21600;

const CHANNEL_TYPE_MAP = { text: 0, voice: 2, category: 4, announcement: 5, stage: 13, forum: 15 };
const SUPPORTED_CREATE_TYPES = new Set(Object.keys(CHANNEL_TYPE_MAP));

const createChannel = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return fail(cb, 'Guild not found');

    const name = cleanText(data.name, CHANNEL_NAME_MAX).trim();
    if (!name) return fail(cb, 'Channel name is required');
    const typeKey = SUPPORTED_CREATE_TYPES.has(data.type) ? data.type : 'text';

    const body = {
        name,
        type: CHANNEL_TYPE_MAP[typeKey],
        permission_overwrites: []
    };
    if (isSnowflake(data.parentId) && typeKey !== 'category') body.parent_id = data.parentId;
    const topic = cleanText(data.topic, TOPIC_MAX).trim();
    if (topic) body.topic = topic;
    if (data.nsfw === true) body.nsfw = true;
    if (Number.isInteger(data.rateLimitPerUser) && data.rateLimitPerUser >= 0 && data.rateLimitPerUser <= SLOWMODE_MAX) {
        body.rate_limit_per_user = data.rateLimitPerUser;
    }
    if (Number.isInteger(data.bitrate) && data.bitrate >= 8000 && data.bitrate <= 384000) body.bitrate = data.bitrate;
    if (Number.isInteger(data.userLimit) && data.userLimit > 0 && data.userLimit <= 99) body.user_limit = data.userLimit;

    try {
        const { ok, data: channel, status } = await apiRequest(client, `/guilds/${data.guildId}/channels`, { method: 'POST', body });
        if (!ok || !channel?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not create channel');
        cb({ ok: true, channel: formatChannel(channel) });
    } catch (e) {
        console.error('CreateChannel Error:', e.message);
        fail(cb, 'Could not create channel');
    }
};

const updateChannel = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const channel = client.channels.cache.get(data.channelId) || await client.channels.fetch(data.channelId).catch(() => null);
        if (!channel) return fail(cb, 'Channel not found');

        const body = {};
        if (data.name !== undefined) {
            const name = cleanText(data.name, CHANNEL_NAME_MAX).trim();
            if (!name) return fail(cb, 'Channel name is required');
            body.name = name;
        }
        if (data.topic !== undefined) {
            const topic = cleanText(data.topic, TOPIC_MAX).trim();
            body.topic = topic || null;
        }
        if (data.nsfw !== undefined) body.nsfw = Boolean(data.nsfw);
        if (data.rateLimitPerUser !== undefined) {
            if (!Number.isInteger(data.rateLimitPerUser) || data.rateLimitPerUser < 0 || data.rateLimitPerUser > SLOWMODE_MAX) {
                return fail(cb, 'Invalid slowmode');
            }
            body.rate_limit_per_user = data.rateLimitPerUser;
        }
        if (data.parentId !== undefined) body.parent_id = isSnowflake(data.parentId) ? data.parentId : null;
        if (Number.isInteger(data.bitrate) && data.bitrate >= 8000 && data.bitrate <= 384000) body.bitrate = data.bitrate;
        if (Number.isInteger(data.userLimit) && data.userLimit >= 0 && data.userLimit <= 99) body.user_limit = data.userLimit || null;
        if (data.archived !== undefined) body.archived = Boolean(data.archived);
        if (data.locked !== undefined) body.locked = Boolean(data.locked);
        if (data.autoArchiveDuration !== undefined && Number.isInteger(data.autoArchiveDuration)) {
            body.auto_archive_duration = data.autoArchiveDuration;
        }
        if (!Object.keys(body).length) return fail(cb, 'Nothing to update');

        const { ok, data: updated, status } = await apiRequest(client, `/channels/${data.channelId}`, { method: 'PATCH', body });
        if (!ok || !updated?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update channel');
        cb({ ok: true, channel: formatChannel(updated, { detailed: true }) });
    } catch (e) {
        console.error('UpdateChannel Error:', e.message);
        fail(cb, 'Could not update channel');
    }
};

const deleteChannel = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not delete channel');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteChannel Error:', e.message);
        fail(cb, 'Could not delete channel');
    }
};

const updateChannelPositions = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !Array.isArray(data.channels)) return fail(cb, 'Invalid request');
    const payload = data.channels
        .filter((entry) => isPlainObject(entry) && isSnowflake(entry.id) && Number.isInteger(entry.position))
        .slice(0, 100)
        .map((entry) => ({
            id: entry.id,
            position: entry.position,
            ...(entry.parentId !== undefined ? { parent_id: isSnowflake(entry.parentId) ? entry.parentId : null } : {}),
            ...(entry.lockPermissions !== undefined ? { lock_permissions: Boolean(entry.lockPermissions) } : {})
        }));
    if (!payload.length) return fail(cb, 'Nothing to update');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/channels`, { method: 'PATCH', body: payload });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not reorder channels');
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateChannelPositions Error:', e.message);
        fail(cb, 'Could not reorder channels');
    }
};

const getChannel = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const channel = client.channels.cache.get(data.channelId) || await client.channels.fetch(data.channelId).catch(() => null);
        if (!channel) return fail(cb, 'Channel not found');
        const formatted = formatChannel(channel, { detailed: true });
        if (formatted.permissionOverwrites?.length === 0 && !client.user?.bot) {
            // selfbot caches can miss overwrites until a channel fetch resolves
            const { data: raw } = await apiRequest(client, `/channels/${data.channelId}`);
            if (raw?.id && Array.isArray(raw.permission_overwrites)) {
                formatted.permissionOverwrites = raw.permission_overwrites.map((o) => ({
                    id: o.id,
                    type: o.type === 1 ? 'member' : 'role',
                    allow: Number(BigInt(o.allow ?? 0)),
                    deny: Number(BigInt(o.deny ?? 0))
                }));
            }
        }
        cb({ ok: true, channel: formatted });
    } catch (e) {
        console.error('GetChannel Error:', e.message);
        fail(cb, 'Could not load channel');
    }
};

const updateChannelPermissions = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.targetId) || !['role', 'member'].includes(data.type)) {
        return fail(cb, 'Invalid request');
    }
    // allow/deny は文字列または数値で受ける(2^53超のビットフィールドに対応)
    const parseBit = (value) => {
        try { return BigInt(value ?? 0); } catch { return 0n; }
    };
    const allow = parseBit(data.allow);
    const deny = parseBit(data.deny);
    try {
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}/permissions/${data.targetId}`, {
            method: 'PUT',
            body: {
                type: data.type === 'member' ? 1 : 0,
                allow: allow.toString(),
                deny: deny.toString()
            }
        });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update permissions');
        const { data: raw } = await apiRequest(client, `/channels/${data.channelId}`);
        const permissionOverwrites = (raw?.permission_overwrites || []).map((o) => ({
            id: o.id,
            type: o.type === 1 ? 'member' : 'role',
            allow: Number(BigInt(o.allow ?? 0)),
            deny: Number(BigInt(o.deny ?? 0))
        }));
        cb({ ok: true, permissionOverwrites });
    } catch (e) {
        console.error('UpdateChannelPermissions Error:', e.message);
        fail(cb, 'Could not update permissions');
    }
};

const deleteChannelPermission = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.targetId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}/permissions/${data.targetId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not remove overwrite');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteChannelPermission Error:', e.message);
        fail(cb, 'Could not remove overwrite');
    }
};

const getChannelWebhooks = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const { ok, data: webhooks, status } = await apiRequest(client, `/channels/${data.channelId}/webhooks`);
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not load webhooks');
        cb({
            ok: true,
            webhooks: (Array.isArray(webhooks) ? webhooks : []).map((webhook) => ({
                id: webhook.id,
                name: webhook.name,
                avatar: webhook.avatar ? `https://cdn.discordapp.com/avatars/${webhook.id}/${webhook.avatar}.png?size=128` : null,
                channelId: webhook.channel_id,
                token: webhook.token ?? null,
                applicationId: webhook.application_id ?? null
            }))
        });
    } catch (e) {
        console.error('GetChannelWebhooks Error:', e.message);
        fail(cb, 'Could not load webhooks');
    }
};

const createWebhook = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    const name = cleanText(data.name, 80).trim();
    if (!name) return fail(cb, 'Webhook name is required');
    const body = { name };
    const avatar = validateImage(data.avatar, 1024 * 1024);
    if (data.avatar && !avatar) return fail(cb, 'Invalid avatar image');
    if (avatar) body.avatar = avatar;
    try {
        const { ok, data: webhook, status } = await apiRequest(client, `/channels/${data.channelId}/webhooks`, { method: 'POST', body });
        if (!ok || !webhook?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not create webhook');
        cb({ ok: true, webhook: { id: webhook.id, name: webhook.name, channelId: webhook.channel_id } });
    } catch (e) {
        console.error('CreateWebhook Error:', e.message);
        fail(cb, 'Could not create webhook');
    }
};

const deleteWebhook = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.webhookId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/webhooks/${data.webhookId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not delete webhook');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteWebhook Error:', e.message);
        fail(cb, 'Could not delete webhook');
    }
};

const editWebhook = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.webhookId)) return fail(cb, 'Invalid request');
    const body = {};
    if (data.name != null) {
        const name = cleanText(data.name, 80).trim();
        if (!name) return fail(cb, 'Webhook name is required');
        body.name = name;
    }
    if (data.avatar != null) {
        const avatar = data.avatar === '' ? null : validateImage(data.avatar, 1024 * 1024);
        if (data.avatar && data.avatar !== '' && !avatar) return fail(cb, 'Invalid avatar image');
        body.avatar = avatar;
    }
    if (Object.keys(body).length === 0) return fail(cb, 'Nothing to update');
    try {
        const { ok, data: webhook, status } = await apiRequest(client, `/webhooks/${data.webhookId}`, { method: 'PATCH', body });
        if (!ok || !webhook?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update webhook');
        cb({
            ok: true,
            webhook: {
                id: webhook.id,
                name: webhook.name,
                avatar: webhook.avatar ? `https://cdn.discordapp.com/avatars/${webhook.id}/${webhook.avatar}.png?size=128` : null,
                channelId: webhook.channel_id,
                token: webhook.token ?? null,
            },
        });
    } catch (e) {
        console.error('EditWebhook Error:', e.message);
        fail(cb, 'Could not update webhook');
    }
};

const createThread = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    const name = cleanText(data.name, 100).trim();
    if (!name) return fail(cb, 'Thread name is required');
    try {
        const base = `/channels/${data.channelId}/threads`;
        const autoArchive = [60, 1440, 4320, 10080].includes(data.autoArchiveDuration) ? data.autoArchiveDuration : 1440;
        const body = { name, auto_archive_duration: autoArchive, type: data.type === 'private' ? 12 : 11 };
        const path = isSnowflake(data.messageId) ? `${base}?message_id=${data.messageId}` : base;
        const { ok, data: thread, status } = await apiRequest(client, path, { method: 'POST', body });
        if (!ok || !thread?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not create thread');
        cb({ ok: true, thread: formatChannel(thread) });
    } catch (e) {
        console.error('CreateThread Error:', e.message);
        fail(cb, 'Could not create thread');
    }
};

const updateThread = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.threadId)) return fail(cb, 'Invalid request');
    const body = {};
    if (data.name !== undefined) {
        const name = cleanText(data.name, 100).trim();
        if (!name) return fail(cb, 'Thread name is required');
        body.name = name;
    }
    if (data.archived !== undefined) body.archived = Boolean(data.archived);
    if (data.locked !== undefined) body.locked = Boolean(data.locked);
    if (!Object.keys(body).length) return fail(cb, 'Nothing to update');
    try {
        const { ok, data: thread, status } = await apiRequest(client, `/channels/${data.threadId}`, { method: 'PATCH', body });
        if (!ok || !thread?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update thread');
        cb({ ok: true, thread: formatChannel(thread) });
    } catch (e) {
        console.error('UpdateThread Error:', e.message);
        fail(cb, 'Could not update thread');
    }
};

const threadMembership = (method) => async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.threadId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/channels/${data.threadId}/thread-members/@me`, { method });
        if (!ok && method === 'PUT') return fail(cb, status === 403 ? 'Missing permissions' : 'Could not join thread');
        cb({ ok: true });
    } catch (e) {
        console.error('ThreadMembership Error:', e.message);
        fail(cb, 'Thread operation failed');
    }
};

const sendTyping = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const { ok } = await apiRequest(client, `/channels/${data.channelId}/typing`, { method: 'POST', body: {} });
        cb({ ok });
    } catch (e) {
        cb({ ok: false });
    }
};

const EVENTS = [
    'createChannel', 'updateChannel', 'deleteChannel', 'updateChannelPositions',
    'getChannel', 'updateChannelPermissions', 'deleteChannelPermission',
    'getChannelWebhooks', 'createWebhook', 'deleteWebhook', 'editWebhook',
    'createThread', 'updateThread', 'joinThread', 'leaveThread', 'sendTyping',
    'ackChannel'
];

/**
 * チャンネルを既読にする
 */
const ackChannel = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const { ok } = await apiRequest(client, `/channels/${data.channelId}/ack`, { method: 'POST', body: { token: null } });
        cb({ ok });
    } catch (e) {
        cb({ ok: false });
    }
};

module.exports = (io) => {
    const register = (socket) => {
        socket.on('createChannel', (data, cb) => createChannel(socket, data, safeAck(cb)));
        socket.on('updateChannel', (data, cb) => updateChannel(socket, data, safeAck(cb)));
        socket.on('deleteChannel', (data, cb) => deleteChannel(socket, data, safeAck(cb)));
        socket.on('updateChannelPositions', (data, cb) => updateChannelPositions(socket, data, safeAck(cb)));
        socket.on('getChannel', (data, cb) => getChannel(socket, data, safeAck(cb)));
        socket.on('updateChannelPermissions', (data, cb) => updateChannelPermissions(socket, data, safeAck(cb)));
        socket.on('deleteChannelPermission', (data, cb) => deleteChannelPermission(socket, data, safeAck(cb)));
        socket.on('getChannelWebhooks', (data, cb) => getChannelWebhooks(socket, data, safeAck(cb)));
        socket.on('createWebhook', (data, cb) => createWebhook(socket, data, safeAck(cb)));
        socket.on('deleteWebhook', (data, cb) => deleteWebhook(socket, data, safeAck(cb)));
        socket.on('editWebhook', (data, cb) => editWebhook(socket, data, safeAck(cb)));
        socket.on('createThread', (data, cb) => createThread(socket, data, safeAck(cb)));
        socket.on('updateThread', (data, cb) => updateThread(socket, data, safeAck(cb)));
        socket.on('joinThread', (data, cb) => threadMembership('PUT')(socket, data, safeAck(cb)));
        socket.on('leaveThread', (data, cb) => threadMembership('DELETE')(socket, data, safeAck(cb)));
        socket.on('sendTyping', (data, cb) => sendTyping(socket, data, safeAck(cb)));
        socket.on('ackChannel', (data, cb) => ackChannel(socket, data, safeAck(cb)));
    };
    return { register, events: EVENTS };
};
