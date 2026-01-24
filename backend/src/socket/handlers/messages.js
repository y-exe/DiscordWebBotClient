const {
    getClient,
    fail,
    apiRequest,
    isSnowflake,
    isPlainObject,
    safeAck
} = require('./common');
const { MAX_MESSAGE_LENGTH, SNOWFLAKE_RE } = require('../../config');
const { formatMessageWithReference } = require('../../services/formatter');

const fetchChannel = async (client, channelId) => {
    try {
        return client.channels.cache.get(channelId) || await client.channels.fetch(channelId);
    } catch {
        return null;
    }
};

const fetchMessage = async (client, channelId, messageId) => {
    const channel = await fetchChannel(client, channelId);
    if (!channel?.messages) return null;
    try {
        return channel.messages.cache.get(messageId) || await channel.messages.fetch(messageId);
    } catch {
        return null;
    }
};

const editMessage = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId)) return fail(cb, 'Invalid request');
    if (typeof data.content !== 'string' || !data.content.trim()) return fail(cb, 'Message is empty');
    if (data.content.length > MAX_MESSAGE_LENGTH) return fail(cb, 'Message is too long');
    try {
        const message = await fetchMessage(client, data.channelId, data.messageId);
        if (!message) return fail(cb, 'Message not found');
        await message.edit({ content: data.content });
        cb({ ok: true });
    } catch (e) {
        console.error('EditMessage Error:', e.message);
        fail(cb, 'Message could not be edited');
    }
};

const deleteMessage = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId)) return fail(cb, 'Invalid request');
    try {
        const message = await fetchMessage(client, data.channelId, data.messageId);
        if (!message) return fail(cb, 'Message not found');
        await message.delete();
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteMessage Error:', e.message);
        fail(cb, 'Message could not be deleted');
    }
};

const bulkDeleteMessages = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !Array.isArray(data.messageIds)) return fail(cb, 'Invalid request');
    const ids = data.messageIds.filter((id) => typeof id === 'string' && SNOWFLAKE_RE.test(id)).slice(0, 100);
    if (!ids.length) return fail(cb, 'Nothing to delete');
    try {
        const channel = await fetchChannel(client, data.channelId);
        if (!channel?.bulkDelete) return fail(cb, 'Channel not found');
        await channel.bulkDelete(ids, true);
        cb({ ok: true, deleted: ids.length });
    } catch (e) {
        console.error('BulkDeleteMessages Error:', e.message);
        fail(cb, 'Messages could not be deleted');
    }
};

const setPinned = (pinned) => async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId)) return fail(cb, 'Invalid request');
    try {
        const message = await fetchMessage(client, data.channelId, data.messageId);
        if (!message) return fail(cb, 'Message not found');
        await (pinned ? message.pin() : message.unpin());
        cb({ ok: true });
    } catch (e) {
        console.error('SetPinned Error:', e.message);
        fail(cb, pinned ? 'Message could not be pinned' : 'Message could not be unpinned');
    }
};

const getPinnedMessages = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const channel = await fetchChannel(client, data.channelId);
        if (!channel?.messages) return fail(cb, 'Channel not found');
        const pins = await channel.messages.fetchPinned();
        const formatted = await Promise.all(Array.from(pins.values()).reverse().map((m) => formatMessageWithReference(m, null)));
        cb({ ok: true, messages: formatted.filter(Boolean) });
    } catch (e) {
        console.error('GetPinnedMessages Error:', e.message);
        fail(cb, 'Could not load pinned messages');
    }
};

const getReactionUsers = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId) || typeof data.emoji !== 'string' || !data.emoji || data.emoji.length > 128) {
        return fail(cb, 'Invalid request');
    }
    try {
        const emojiParam = encodeURIComponent(data.emoji);
        const { ok, data: users, status } = await apiRequest(client, `/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}`, { query: { limit: 100 } });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not load reactions');
        cb({
            ok: true,
            users: (Array.isArray(users) ? users : []).map((user) => ({
                id: user.id,
                username: user.username,
                displayName: user.global_name ?? user.username,
                avatar: user.avatar
                    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${String(user.avatar).startsWith('a_') ? 'gif' : 'png'}?size=64`
                    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) >> 22n) % 6}.png`,
                bot: Boolean(user.bot)
            }))
        });
    } catch (e) {
        console.error('GetReactionUsers Error:', e.message);
        fail(cb, 'Could not load reactions');
    }
};

const removeUserReaction = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId) || !isSnowflake(data.userId) || typeof data.emoji !== 'string' || !data.emoji || data.emoji.length > 128) {
        return fail(cb, 'Invalid request');
    }
    try {
        const emojiParam = encodeURIComponent(data.emoji);
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}/${data.userId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not remove reaction');
        cb({ ok: true });
    } catch (e) {
        console.error('RemoveUserReaction Error:', e.message);
        fail(cb, 'Could not remove reaction');
    }
};

const clearReactions = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId)) return fail(cb, 'Invalid request');
    try {
        const message = await fetchMessage(client, data.channelId, data.messageId);
        if (!message) return fail(cb, 'Message not found');
        await message.reactions.removeAll();
        cb({ ok: true });
    } catch (e) {
        console.error('ClearReactions Error:', e.message);
        fail(cb, 'Could not clear reactions');
    }
};

const crosspostMessage = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}/messages/${data.messageId}/crosspost`, { method: 'POST', body: {} });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not publish message');
        cb({ ok: true });
    } catch (e) {
        console.error('CrosspostMessage Error:', e.message);
        fail(cb, 'Could not publish message');
    }
};

const EVENTS = [
    'editMessage', 'deleteMessage', 'bulkDeleteMessages',
    'pinMessage', 'unpinMessage', 'getPinnedMessages',
    'getReactionUsers', 'removeUserReaction', 'clearReactions', 'removeReactionEmoji',
    'searchMessages', 'crosspostMessage'
];

/**
 * メッセージ検索 (GET /guilds/:id/messages/search)
 */
const searchMessages = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || typeof data.query !== 'string' || !data.query.trim()) return fail(cb, 'Invalid request');
    const query = data.query.trim().slice(0, 200);
    const guildId = isSnowflake(data.guildId) ? data.guildId : null;
    const channelId = isSnowflake(data.channelId) ? data.channelId : null;
    if (!guildId && !channelId) return fail(cb, 'Invalid request');
    const params = { content: query, include_nsfw: 'true', limit: 20 };
    if (channelId) params.channel_id = channelId;
    const path = guildId ? `/guilds/${guildId}/messages/search` : `/channels/${channelId}/messages/search`;
    try {
        const { ok, data: result, status } = await apiRequest(client, path, { query: params });
        if (!ok || !result) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not search messages');
        const messages = [];
        if (Array.isArray(result.messages)) {
            for (const group of result.messages) {
                for (const raw of (Array.isArray(group) ? group : [group])) {
                    if (!raw?.id) continue;
                    messages.push({
                        id: raw.id,
                        channelId: raw.channel_id,
                        content: raw.content ?? '',
                        timestamp: raw.timestamp ? Date.parse(raw.timestamp) : null,
                        author: raw.author ? {
                            id: raw.author.id,
                            username: raw.author.username,
                            displayName: raw.author.global_name ?? raw.author.username,
                            avatar: raw.author.avatar
                                ? `https://cdn.discordapp.com/avatars/${raw.author.id}/${raw.author.avatar}.${String(raw.author.avatar).startsWith('a_') ? 'gif' : 'png'}?size=64`
                                : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(raw.author.id) >> 22n) % 6}.png`
                        } : null,
                        hit: Array.isArray(result.hit) && result.hit.some((hit) => hit.includes && hit.includes(raw.id)) ? true : undefined
                    });
                }
            }
        }
        cb({ ok: true, total: result.total_results ?? messages.length, messages });
    } catch (e) {
        console.error('SearchMessages Error:', e.message);
        fail(cb, 'Could not search messages');
    }
};

/**
 * 特定の絵文字のリアクションを全ユーザーから削除
 */
const removeReactionEmoji = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.messageId) || typeof data.emoji !== 'string' || !data.emoji || data.emoji.length > 128) {
        return fail(cb, 'Invalid request');
    }
    try {
        const emojiParam = encodeURIComponent(data.emoji);
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not remove reactions');
        cb({ ok: true });
    } catch (e) {
        console.error('RemoveReactionEmoji Error:', e.message);
        fail(cb, 'Could not remove reactions');
    }
};

module.exports = (io) => {
    const register = (socket) => {
        socket.on('editMessage', (data, cb) => editMessage(socket, data, safeAck(cb)));
        socket.on('deleteMessage', (data, cb) => deleteMessage(socket, data, safeAck(cb)));
        socket.on('bulkDeleteMessages', (data, cb) => bulkDeleteMessages(socket, data, safeAck(cb)));
        socket.on('pinMessage', (data, cb) => setPinned(true)(socket, data, safeAck(cb)));
        socket.on('unpinMessage', (data, cb) => setPinned(false)(socket, data, safeAck(cb)));
        socket.on('getPinnedMessages', (data, cb) => getPinnedMessages(socket, data, safeAck(cb)));
        socket.on('getReactionUsers', (data, cb) => getReactionUsers(socket, data, safeAck(cb)));
        socket.on('removeUserReaction', (data, cb) => removeUserReaction(socket, data, safeAck(cb)));
        socket.on('clearReactions', (data, cb) => clearReactions(socket, data, safeAck(cb)));
        socket.on('removeReactionEmoji', (data, cb) => removeReactionEmoji(socket, data, safeAck(cb)));
        socket.on('searchMessages', (data, cb) => searchMessages(socket, data, safeAck(cb)));
        socket.on('crosspostMessage', (data, cb) => crosspostMessage(socket, data, safeAck(cb)));
    };
    return { register, events: EVENTS };
};
