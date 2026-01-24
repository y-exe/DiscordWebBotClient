const {
    getClient,
    fail,
    apiRequest,
    formatRole,
    isSnowflake,
    isPlainObject,
    cleanText,
    safeAck
} = require('./common');

const ROLE_NAME_MAX = 100;
const AUDIT_ACTIONS = [
    1, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 25, 26, 27, 28,
    30, 31, 32, 40, 41, 42, 50, 51, 60, 62, 72, 73, 74, 75, 80,
    81, 82, 83, 84, 85, 90, 91, 92, 100, 101, 102, 110, 111, 112, 121, 130
];

const createRole = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const name = cleanText(data.name, ROLE_NAME_MAX).trim() || 'new role';
    const body = { name };
    if (Number.isInteger(data.color) && data.color >= 0 && data.color <= 0xFFFFFF) body.color = data.color;
    if (data.hoist !== undefined) body.hoist = Boolean(data.hoist);
    if (data.mentionable !== undefined) body.mentionable = Boolean(data.mentionable);
    if (data.permissions != null) {
        try { body.permissions = BigInt(data.permissions).toString(); } catch { return fail(cb, 'Invalid permissions'); }
    }
    try {
        const { ok, data: role, status } = await apiRequest(client, `/guilds/${data.guildId}/roles`, { method: 'POST', body });
        if (!ok || !role?.id) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not create role');
        cb({ ok: true, role: formatRole({ ...role, hexColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#000000', position: role.position ?? 0, permissions: BigInt(role.permissions ?? '0'), createdTimestamp: null, members: { cache: new Map() }, managed: role.managed }) });
    } catch (e) {
        console.error('CreateRole Error:', e.message);
        fail(cb, 'Could not create role');
    }
};

const fetchRoleCache = async (client, guildId) => {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;
    if ((!guild.roles?.cache || guild.roles.cache.size <= 1) && guild.roles?.fetch) {
        try { await guild.roles.fetch(); } catch { }
    }
    return guild;
};

const updateRole = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.roleId)) return fail(cb, 'Invalid request');
    const body = {};
    if (data.name !== undefined) {
        const name = cleanText(data.name, ROLE_NAME_MAX).trim();
        if (!name) return fail(cb, 'Role name is required');
        body.name = name;
    }
    if (data.color !== undefined) {
        if (data.color === null) body.color = 0;
        else if (Number.isInteger(data.color) && data.color >= 0 && data.color <= 0xFFFFFF) body.color = data.color;
        else return fail(cb, 'Invalid color');
    }
    if (data.hoist !== undefined) body.hoist = Boolean(data.hoist);
    if (data.mentionable !== undefined) body.mentionable = Boolean(data.mentionable);
    if (data.permissions != null) {
        try { body.permissions = BigInt(data.permissions).toString(); } catch { return fail(cb, 'Invalid permissions'); }
    }
    if (!Object.keys(body).length) return fail(cb, 'Nothing to update');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/roles/${data.roleId}`, { method: 'PATCH', body });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update role');
        const guild = await fetchRoleCache(client, data.guildId);
        const role = guild?.roles?.cache?.get(data.roleId);
        cb({ ok: true, role: role ? formatRole(role) : null });
    } catch (e) {
        console.error('UpdateRole Error:', e.message);
        fail(cb, 'Could not update role');
    }
};

const deleteRole = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.roleId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/roles/${data.roleId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not delete role');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteRole Error:', e.message);
        fail(cb, 'Could not delete role');
    }
};

const updateRolePositions = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !Array.isArray(data.roles)) return fail(cb, 'Invalid request');
    const payload = data.roles
        .filter((entry) => isPlainObject(entry) && isSnowflake(entry.id) && Number.isInteger(entry.position))
        .slice(0, 200)
        .map((entry) => ({ id: entry.id, position: entry.position }));
    if (!payload.length) return fail(cb, 'Nothing to update');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}/roles`, { method: 'PATCH', body: payload });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not reorder roles');
        const guild = await fetchRoleCache(client, data.guildId);
        cb({ ok: true, roles: guild ? Array.from(guild.roles.cache.values()).map(formatRole).sort((a, b) => b.position - a.position) : [] });
    } catch (e) {
        console.error('UpdateRolePositions Error:', e.message);
        fail(cb, 'Could not reorder roles');
    }
};

const getGuildAuditLogs = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const limit = Number.isInteger(data.limit) ? Math.min(Math.max(data.limit, 1), 100) : 50;
    try {
        const { ok, data: logs, status } = await apiRequest(client, `/guilds/${data.guildId}/audit-logs`, { query: { limit } });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not load audit log');
        cb({
            ok: true,
            entries: (Array.isArray(logs?.audit_log_entries) ? logs.audit_log_entries : [])
                .filter((entry) => AUDIT_ACTIONS.includes(entry.action_type))
                .map((entry) => ({
                    id: entry.id,
                    action: entry.action_type,
                    executor: logs.users?.find((u) => u.id === entry.user_id) ? {
                        id: entry.user_id,
                        username: logs.users.find((u) => u.id === entry.user_id).username
                    } : null,
                    targetId: entry.target_id ?? null,
                    reason: (entry.options?.reason ?? entry.reason) || (logs.entries ? null : null),
                    changes: Array.isArray(entry.changes) ? entry.changes.map((change) => ({ key: change.key, old: change.old_value, new: change.new_value })) : [],
                    createdAt: entry.id ? Number(BigInt(entry.id) >> 22n) + 1420070400000 : null,
                    count: entry.options?.count ?? null,
                    channelId: entry.options?.channel_id ?? null,
                    roleName: entry.options?.role_name ?? null
                }))
        });
    } catch (e) {
        console.error('GetGuildAuditLogs Error:', e.message);
        fail(cb, 'Could not load audit log');
    }
};

const register = (socket) => {
    socket.on('createRole', (data, cb) => createRole(socket, data, safeAck(cb)));
    socket.on('updateRole', (data, cb) => updateRole(socket, data, safeAck(cb)));
    socket.on('deleteRole', (data, cb) => deleteRole(socket, data, safeAck(cb)));
    socket.on('updateRolePositions', (data, cb) => updateRolePositions(socket, data, safeAck(cb)));
    socket.on('getGuildAuditLogs', (data, cb) => getGuildAuditLogs(socket, data, safeAck(cb)));
};

module.exports = { register };