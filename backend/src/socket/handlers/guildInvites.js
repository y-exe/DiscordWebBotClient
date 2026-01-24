const {
    getClient,
    fail,
    apiRequest,
    isSnowflake,
    isPlainObject,
    safeAck
} = require('./common');

const getGuildInvites = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    try {
        const { ok, data: invites, status } = await apiRequest(client, `/guilds/${data.guildId}/invites`);
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not load invites');
        cb({
            ok: true,
            invites: (Array.isArray(invites) ? invites : []).map((invite) => ({
                code: invite.code,
                url: `https://discord.gg/${invite.code}`,
                channel: invite.channel ? { id: invite.channel.id, name: invite.channel.name } : null,
                inviter: invite.inviter ? { id: invite.inviter.id, username: invite.inviter.username } : null,
                uses: invite.uses ?? 0,
                maxUses: invite.max_uses ?? 0,
                maxAge: invite.max_age ?? 0,
                temporary: Boolean(invite.temporary),
                createdAt: invite.created_at ? Date.parse(invite.created_at) : null,
                expiresAt: invite.expires_at ? Date.parse(invite.expires_at) : null
            }))
        });
    } catch (e) {
        console.error('GetGuildInvites Error:', e.message);
        fail(cb, 'Could not load invites');
    }
};

const createInvite = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    const maxAge = Number.isInteger(data.maxAge) ? Math.min(Math.max(data.maxAge, 0), 604800) : 86400;
    const maxUses = Number.isInteger(data.maxUses) ? Math.min(Math.max(data.maxUses, 0), 100) : 0;
    const temporary = Boolean(data.temporary);
    try {
        const { ok, data: invite, status } = await apiRequest(client, `/channels/${data.channelId}/invites`, {
            method: 'POST',
            body: { max_age: maxAge, max_uses: maxUses, temporary, unique: true }
        });
        if (!ok || !invite?.code) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not create invite');
        cb({
            ok: true,
            invite: {
                code: invite.code,
                url: `https://discord.gg/${invite.code}`,
                maxAge: invite.max_age ?? maxAge,
                maxUses: invite.max_uses ?? maxUses,
                channel: invite.channel ? { id: invite.channel.id, name: invite.channel.name } : null,
                inviter: invite.inviter ? { id: invite.inviter.id, username: invite.inviter.username } : null,
                expiresAt: invite.expires_at ? Date.parse(invite.expires_at) : null
            }
        });
    } catch (e) {
        console.error('CreateInvite Error:', e.message);
        fail(cb, 'Could not create invite');
    }
};

const deleteInvite = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || typeof data.code !== 'string' || !/^[A-Za-z0-9_-]{2,32}$/.test(data.code)) {
        return fail(cb, 'Invalid request');
    }
    try {
        const { ok, status } = await apiRequest(client, `/invites/${data.code}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not delete invite');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteInvite Error:', e.message);
        fail(cb, 'Could not delete invite');
    }
};

const getInviteInfo = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || typeof data.code !== 'string' || !/^[A-Za-z0-9_-]{2,32}$/.test(data.code)) {
        return fail(cb, 'Invalid request');
    }
    try {
        const { ok, data: invite } = await apiRequest(client, `/invites/${data.code}`, { query: { with_counts: true } });
        if (!ok || !invite?.guild) return fail(cb, 'Invite not found');
        cb({
            ok: true,
            invite: {
                code: invite.code,
                guild: {
                    id: invite.guild.id,
                    name: invite.guild.name,
                    icon: invite.guild.icon ? `https://cdn.discordapp.com/icons/${invite.guild.id}/${invite.guild.icon}.png?size=256` : null,
                    banner: invite.guild.banner ? `https://cdn.discordapp.com/banners/${invite.guild.id}/${invite.guild.banner}.png?size=512` : null,
                    description: invite.guild.description ?? null
                },
                channel: invite.channel ? { id: invite.channel.id, name: invite.channel.name, type: invite.channel.type } : null,
                memberCount: invite.approximate_member_count ?? null,
                onlineCount: invite.approximate_presence_count ?? null
            }
        });
    } catch (e) {
        console.error('GetInviteInfo Error:', e.message);
        fail(cb, 'Invite not found');
    }
};

const joinGuild = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || typeof data.code !== 'string' || !/^[A-Za-z0-9_-]{2,32}$/.test(data.code)) {
        return fail(cb, 'Invalid request');
    }
    try {
        const { ok, data: result, status } = await apiRequest(client, `/invites/${data.code}`, { method: 'POST', body: {} });
        if (!ok) return fail(cb, status === 404 ? 'Invite not found' : status === 403 ? 'Could not join (banned or full?)' : 'Could not join server');
        const guildId = result?.guild?.id;
        if (guildId && client.guilds?.fetch) client.guilds.fetch(guildId).catch(() => { });
        cb({
            ok: true,
            guild: result?.guild ? { id: result.guild.id, name: result.guild.name } : null,
            channel: result?.channel ? { id: result.channel.id } : null
        });
    } catch (e) {
        console.error('JoinGuild Error:', e.message);
        fail(cb, 'Could not join server');
    }
};

const register = (socket) => {
    socket.on('getGuildInvites', (data, cb) => getGuildInvites(socket, data, safeAck(cb)));
    socket.on('createInvite', (data, cb) => createInvite(socket, data, safeAck(cb)));
    socket.on('deleteInvite', (data, cb) => deleteInvite(socket, data, safeAck(cb)));
    socket.on('getInviteInfo', (data, cb) => getInviteInfo(socket, data, safeAck(cb)));
    socket.on('joinGuild', (data, cb) => joinGuild(socket, data, safeAck(cb)));
};

module.exports = { register };