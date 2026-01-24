const {
    getClient,
    fail,
    apiRequest,
    validateImage,
    isSnowflake,
    isPlainObject,
    cleanText,
    safeAck
} = require('./common');

const EMOJI_NAME_MAX = 32;

const createEmoji = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const name = cleanText(data.name, EMOJI_NAME_MAX).trim().replace(/[^\w-]/g, '');
    if (!name || name.length < 2) return fail(cb, 'Emoji name must be 2+ letters');
    const image = validateImage(data.image, 256 * 1024);
    if (!image) return fail(cb, 'Emoji must be an image under 256KB');
    try {
        const { ok, data: emoji, status } = await apiRequest(client, `/guilds/${data.guildId}/emojis`, {
            method: 'POST',
            body: { name, image }
        });
        if (!ok || !emoji?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not create emoji');
        cb({
            ok: true,
            emoji: {
                id: emoji.id,
                name: emoji.name,
                animated: Boolean(emoji.animated),
                url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48`
            }
        });
    } catch (e) {
        console.error('CreateEmoji Error:', e.message);
        fail(cb, 'Could not create emoji');
    }
};

const deleteEmoji = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.emojiId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/emojis/${data.emojiId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not delete emoji');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteEmoji Error:', e.message);
        fail(cb, 'Could not delete emoji');
    }
};

const updateEmoji = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.emojiId)) return fail(cb, 'Invalid request');
    const name = cleanText(data.name, EMOJI_NAME_MAX).trim().replace(/[^\w-]/g, '');
    if (!name || name.length < 2) return fail(cb, 'Emoji name must be 2+ letters');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/emojis/${data.emojiId}`, {
            method: 'PATCH',
            body: { name }
        });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update emoji');
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateEmoji Error:', e.message);
        fail(cb, 'Could not update emoji');
    }
};

const createSticker = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const name = cleanText(data.name, 30).trim();
    const description = cleanText(data.description, 100).trim() || '';
    const tags = cleanText(data.tags, 200).trim() || name;
    if (!name || name.length < 2) return fail(cb, 'Sticker name must be 2+ letters');
    const image = validateImage(data.file, 512 * 1024);
    if (!image) return fail(cb, 'Sticker must be a PNG/APNG under 512KB');
    try {
        const base64 = image.split(',')[1];
        const mime = image.slice(5, image.indexOf(';'));
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('tags', tags);
        formData.append('file', new Blob([Buffer.from(base64, 'base64')], { type: mime }), `${name}.${mime === 'image/png' ? 'png' : 'apng'}`);
        const response = await fetch(`https://discord.com/api/v10/guilds/${data.guildId}/stickers`, {
            method: 'POST',
            headers: { Authorization: client.user?.bot ? `Bot ${client.token}` : client.token },
            body: formData,
            redirect: 'error',
            signal: AbortSignal.timeout(15_000)
        });
        const body2 = await response.json().catch(() => null);
        if (!response.ok || !body2?.id) return fail(cb, response.status === 403 ? 'Missing permissions' : 'Could not create sticker');
        cb({
            ok: true,
            sticker: {
                id: body2.id,
                name: body2.name,
                description: body2.description ?? '',
                format: body2.format_type,
                url: `https://cdn.discordapp.com/stickers/${body2.id}.png?size=160`
            }
        });
    } catch (e) {
        console.error('CreateSticker Error:', e.message);
        fail(cb, 'Could not create sticker');
    }
};

const deleteSticker = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.stickerId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/stickers/${data.stickerId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not delete sticker');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteSticker Error:', e.message);
        fail(cb, 'Could not delete sticker');
    }
};

const register = (socket) => {
    socket.on('createEmoji', (data, cb) => createEmoji(socket, data, safeAck(cb)));
    socket.on('updateEmoji', (data, cb) => updateEmoji(socket, data, safeAck(cb)));
    socket.on('deleteEmoji', (data, cb) => deleteEmoji(socket, data, safeAck(cb)));
    socket.on('createSticker', (data, cb) => createSticker(socket, data, safeAck(cb)));
    socket.on('deleteSticker', (data, cb) => deleteSticker(socket, data, safeAck(cb)));
};

module.exports = { register };