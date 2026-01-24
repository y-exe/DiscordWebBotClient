const {
    getClient,
    fail,
    apiRequest,
    formatMember,
    isSnowflake,
    isPlainObject,
    cleanText,
    safeAck
} = require('./common');

const NICKNAME_MAX = 32;

const getGuildMembers = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const limit = Number.isInteger(data.limit) ? Math.min(Math.max(data.limit, 1), 1000) : 1000;
    try {
        const { ok, data: members } = await apiRequest(client, `/guilds/${data.guildId}/members`, { query: { limit } });
        if (!ok || !Array.isArray(members)) {
            const guild = client.guilds.cache.get(data.guildId);
            const cached = guild ? Array.from(guild.members.cache.values()).slice(0, limit).map(formatMember) : [];
            return cb({ ok: true, members: cached, partial: true });
        }
        const guild = client.guilds.cache.get(data.guildId);
        const presenceById = new Map(Array.from(guild?.presences?.cache?.values?.() || []).map((p) => [p.userId, p.status]));
        cb({
            ok: true,
            members: members.map((member) => ({
                id: member.user?.id,
                user: {
                    id: member.user?.id,
                    username: member.user?.username ?? '',
                    displayName: member.user?.global_name ?? member.user?.username ?? '',
                    bot: Boolean(member.user?.bot)
                },
                nickname: member.nick ?? null,
                avatar: member.user?.avatar
                    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.${String(member.user.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128`
                    : (member.user?.id ? `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(member.user.id) >> 22n) % 6}.png` : null),
                roles: Array.isArray(member.roles) ? member.roles : [],
                joinedAt: member.joined_at ? Date.parse(member.joined_at) : null,
                timeout: member.communication_disabled_until ? Date.parse(member.communication_disabled_until) : null,
                timedOut: Boolean(member.communication_disabled_until && Date.parse(member.communication_disabled_until) > Date.now()),
                status: presenceById.get(member.user?.id) ?? null,
                owner: member.user?.id === (guild?.ownerId)
            })).filter((member) => member.id)
        });
    } catch (e) {
        console.error('GetGuildMembers Error:', e.message);
        fail(cb, 'Could not load members');
    }
};

const kickMember = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/members/${data.userId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not kick member');
        cb({ ok: true });
    } catch (e) {
        console.error('KickMember Error:', e.message);
        fail(cb, 'Could not kick member');
    }
};

const banMember = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    const deleteMessageDays = Number.isInteger(data.deleteMessageDays) ? Math.min(Math.max(data.deleteMessageDays, 0), 7) : 0;
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/bans/${data.userId}`, {
            method: 'PUT',
            body: {
                delete_message_seconds: deleteMessageDays * 86400,
                ...(typeof data.reason === 'string' && data.reason.trim() ? { reason: cleanText(data.reason, 512).trim() } : {})
            }
        });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not ban member');
        cb({ ok: true });
    } catch (e) {
        console.error('BanMember Error:', e.message);
        fail(cb, 'Could not ban member');
    }
};

const unbanMember = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/bans/${data.userId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not unban member');
        cb({ ok: true });
    } catch (e) {
        console.error('UnbanMember Error:', e.message);
        fail(cb, 'Could not unban member');
    }
};

const getGuildBans = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    try {
        const { ok, data: bans, status } = await apiRequest(client, `/guilds/${data.guildId}/bans`, { query: { limit: 1000 } });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not load bans');
        cb({ ok: true, bans: (Array.isArray(bans) ? bans : []).map((ban) => ({
            user: ban.user ? {
                id: ban.user.id,
                username: ban.user.username,
                tag: ban.user.global_name ? `${ban.user.global_name} (${ban.user.username})` : ban.user.username,
                avatar: ban.user.avatar
                    ? `https://cdn.discordapp.com/avatars/${ban.user.id}/${ban.user.avatar}.${String(ban.user.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128`
                    : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(ban.user.id) >> 22n) % 6}.png`
            } : null,
            reason: ban.reason ?? null
        })) });
    } catch (e) {
        console.error('GetGuildBans Error:', e.message);
        fail(cb, 'Could not load bans');
    }
};

const updateMember = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    try {
        if (data.nickname !== undefined) {
            const nickname = cleanText(data.nickname, NICKNAME_MAX).trim();
            const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/members/${data.userId}`, {
                method: 'PATCH',
                body: { nick: nickname || null }
            });
            if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update nickname');
        }
        if (Array.isArray(data.roles)) {
            const roleIds = data.roles.filter(isSnowflake);
            const { data: member } = await apiRequest(client, `/guilds/${data.guildId}/members/${data.userId}`);
            const current = new Set(Array.isArray(member?.roles) ? member.roles : []);
            const target = new Set(roleIds);
            for (const roleId of current) {
                if (!target.has(roleId)) {
                    await apiRequest(client, `/guilds/${data.guildId}/members/${data.userId}/roles/${roleId}`, { method: 'DELETE' }).catch(() => { });
                }
            }
            for (const roleId of target) {
                if (!current.has(roleId)) {
                    await apiRequest(client, `/guilds/${data.guildId}/members/${data.userId}/roles/${roleId}`, { method: 'PUT' }).catch(() => { });
                }
            }
        }
        if (data.timeout !== undefined) {
            const until = data.timeout === null || data.timeout === 0
                ? null
                : new Date(Date.now() + Math.min(Number(data.timeout) || 0, 28 * 86400 * 1000)).toISOString();
            const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/members/${data.userId}`, {
                method: 'PATCH',
                body: { communication_disabled_until: until }
            });
            if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update timeout');
        }
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateMember Error:', e.message);
        fail(cb, 'Could not update member');
    }
};

/**
 * メンバー検索 (GET /guilds/:id/members/search)
 */
const searchGuildMembers = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || typeof data.query !== 'string' || !data.query.trim()) {
        return fail(cb, 'Invalid request');
    }
    const query = cleanText(data.query, 32).trim();
    const limit = Number.isInteger(data.limit) ? Math.min(Math.max(data.limit, 1), 100) : 20;
    try {
        const { ok, data: members, status } = await apiRequest(client, `/guilds/${data.guildId}/members/search`, { query: { query, limit } });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not search members');
        cb({
            ok: true,
            members: (Array.isArray(members) ? members : []).map((member) => ({
                id: member.user?.id,
                user: {
                    id: member.user?.id,
                    username: member.user?.username ?? '',
                    displayName: member.user?.global_name ?? member.user?.username ?? '',
                    bot: Boolean(member.user?.bot)
                },
                nickname: member.nick ?? null,
                avatar: member.user?.avatar
                    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.${String(member.user.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128`
                    : (member.user?.id ? `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(member.user.id) >> 22n) % 6}.png` : null),
                roles: Array.isArray(member.roles) ? member.roles : [],
                joinedAt: member.joined_at ? Date.parse(member.joined_at) : null
            }))
        });
    } catch (e) {
        console.error('SearchGuildMembers Error:', e.message);
        fail(cb, 'Could not search members');
    }
};

/**
 * 役職のメンバー一覧
 */
const getRoleMembers = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.roleId)) return fail(cb, 'Invalid request');
    try {
        const { ok, data: members, status } = await apiRequest(client, `/guilds/${data.guildId}/roles/${data.roleId}/members`, { query: { limit: 100 } });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not load role members');
        cb({
            ok: true,
            members: (Array.isArray(members) ? members : []).map((member) => ({
                id: member.user?.id,
                username: member.user?.username ?? '',
                displayName: member.user?.global_name ?? member.user?.username ?? '',
                nickname: member.nick ?? null,
                avatar: member.user?.avatar
                    ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.${String(member.user.avatar).startsWith('a_') ? 'gif' : 'png'}?size=128`
                    : null,
                roles: Array.isArray(member.roles) ? member.roles : []
            }))
        });
    } catch (e) {
        console.error('GetRoleMembers Error:', e.message);
        fail(cb, 'Could not load role members');
    }
};

const register = (socket) => {
    socket.on('getGuildMembers', (data, cb) => getGuildMembers(socket, data, safeAck(cb)));
    socket.on('searchGuildMembers', (data, cb) => searchGuildMembers(socket, data, safeAck(cb)));
    socket.on('getRoleMembers', (data, cb) => getRoleMembers(socket, data, safeAck(cb)));
    socket.on('kickMember', (data, cb) => kickMember(socket, data, safeAck(cb)));
    socket.on('banMember', (data, cb) => banMember(socket, data, safeAck(cb)));
    socket.on('unbanMember', (data, cb) => unbanMember(socket, data, safeAck(cb)));
    socket.on('getGuildBans', (data, cb) => getGuildBans(socket, data, safeAck(cb)));
    socket.on('updateMember', (data, cb) => updateMember(socket, data, safeAck(cb)));
};

module.exports = { register };