const {
    getClient,
    fail,
    apiRequest,
    isSnowflake,
    isPlainObject,
    cleanText,
    safeAck
} = require('./common');

const STATUSES = new Set(['online', 'idle', 'dnd', 'invisible']);

/**
 * Discord のログインセッション一覧 (for-web Sessions)。
 * ユーザートークンでのみ利用可能 (bot トークンでは 403)。
 */
const getSessions = async (socket, data, cb) => {
    const client = getClient(socket);
    try {
        const { ok, data: sessions, status } = await apiRequest(client, '/users/@me/sessions');
        if (!ok || !Array.isArray(sessions)) return fail(cb, status === 403 ? 'Sessions are not available for this token' : 'Could not load sessions');
        const shard = client.ws?.shards?.get?.(0);
        const gatewaySessionId = client.ws?.session_id
            || client.ws?.sessionId
            || shard?.sessionID
            || shard?.session_id
            || null;
        cb({
            ok: true,
            sessions: sessions.map((session) => ({
                id: session.id,
                current: session.current === true
                    || (gatewaySessionId ? session.session_id === gatewaySessionId : false),
                os: session.client_info?.os || session.client || 'Unknown',
                platform: session.client_info?.platform || session.client || 'unknown',
                location: session.client_info?.location || '',
                lastSeen: session.last_seen || null
            }))
        });
    } catch (e) {
        console.error('GetSessions Error:', e.message);
        fail(cb, 'Could not load sessions');
    }
};

const logoutSession = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || typeof data.sessionId !== 'string' || !data.sessionId) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/users/@me/sessions/${encodeURIComponent(data.sessionId)}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Could not sign out of that session' : 'Could not sign out of session');
        cb({ ok: true });
    } catch (e) {
        console.error('LogoutSession Error:', e.message);
        fail(cb, 'Could not sign out of session');
    }
};

const createDM = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    try {
        const { ok, data: channel, status } = await apiRequest(client, '/users/@me/channels', {
            method: 'POST',
            body: { recipient_id: data.userId }
        });
        if (!ok || !channel?.id) return fail(cb, status === 403 ? 'Cannot open DM with this user' : 'Could not open DM');
        cb({ ok: true, channel: { id: channel.id, type: channel.type ?? 1 } });
    } catch (e) {
        console.error('CreateDM Error:', e.message);
        fail(cb, 'Could not open DM');
    }
};

const createGroupDM = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !Array.isArray(data.userIds)) return fail(cb, 'Invalid request');
    const userIds = [...new Set(data.userIds.filter(isSnowflake))].slice(0, 9);
    if (!userIds.length) return fail(cb, 'Select at least one user');
    const name = cleanText(data.name, 100).trim() || null;
    try {
        const { ok, data: channel, status } = await apiRequest(client, '/users/@me/channels', {
            method: 'POST',
            body: { access_tokens: [], recipients: userIds, ...(name ? { name } : {}) }
        });
        if (!ok || !channel?.id) return fail(cb, status === 403 ? 'Group DM could not be created' : 'Could not create group DM');
        cb({ ok: true, channel: { id: channel.id, type: 3, name: channel.name ?? name ?? 'グループDM' } });
    } catch (e) {
        console.error('CreateGroupDM Error:', e.message);
        fail(cb, 'Could not create group DM');
    }
};

const updateGroupDM = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    const body = {};
    if (data.name !== undefined) {
        const name = cleanText(data.name, 100).trim();
        if (!name) return fail(cb, 'Group name is required');
        body.name = name;
    }
    if (!Object.keys(body).length) return fail(cb, 'Nothing to update');
    try {
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}`, { method: 'PATCH', body });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update group');
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateGroupDM Error:', e.message);
        fail(cb, 'Could not update group');
    }
};

const groupRecipient = (method) => async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/channels/${data.channelId}/recipients/${data.userId}`, { method });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : method === 'PUT' ? 'Could not add user' : 'Could not remove user');
        cb({ ok: true });
    } catch (e) {
        console.error('GroupRecipient Error:', e.message);
        fail(cb, 'Group operation failed');
    }
};

const leaveGroupDM = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const { ok } = await apiRequest(client, `/channels/${data.channelId}`, { method: 'DELETE' });
        cb({ ok });
    } catch (e) {
        console.error('LeaveGroupDM Error:', e.message);
        fail(cb, 'Could not leave group');
    }
};

const sendFriendRequest = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data)) return fail(cb, 'Invalid request');
    try {
        if (isSnowflake(data.userId)) {
            const { ok, status } = await apiRequest(client, `/users/@me/relationships/${data.userId}`, { method: 'PUT', body: { type: 1 } });
            if (!ok) return fail(cb, status === 400 ? 'Friend request could not be sent' : 'Could not send friend request');
            return cb({ ok: true });
        }
        const username = typeof data.username === 'string' ? data.username.trim() : '';
        const discriminator = typeof data.discriminator === 'string' ? data.discriminator.trim() : '0';
        if (!username || username.length > 32) return fail(cb, 'Invalid username');
        const body = discriminator && discriminator !== '0'
            ? { username, discriminator }
            : { username, discriminator: '0' };
        const { ok, status } = await apiRequest(client, '/users/@me/relationships', { method: 'POST', body });
        if (!ok) return fail(cb, status === 400 ? 'User not found' : 'Could not send friend request');
        cb({ ok: true });
    } catch (e) {
        console.error('SendFriendRequest Error:', e.message);
        fail(cb, 'Could not send friend request');
    }
};

const removeRelationship = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    try {
        const { ok } = await apiRequest(client, `/users/@me/relationships/${data.userId}`, { method: 'DELETE' });
        cb({ ok });
    } catch (e) {
        console.error('RemoveRelationship Error:', e.message);
        fail(cb, 'Could not remove friend');
    }
};

const blockUser = (blocked) => async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.userId)) return fail(cb, 'Invalid request');
    try {
        const { ok } = await apiRequest(client, `/users/@me/relationships/${data.userId}`, {
            method: 'PUT',
            body: { type: blocked ? 2 : 1 }
        });
        cb({ ok });
    } catch (e) {
        console.error('BlockUser Error:', e.message);
        fail(cb, 'Operation failed');
    }
};

const setPresence = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !STATUSES.has(data.status)) return fail(cb, 'Invalid request');
    try {
        if (client.user?.bot && typeof client.user.setPresence === 'function') {
            client.user.setPresence({ status: data.status === 'invisible' ? 'invisible' : data.status });
            return cb({ ok: true });
        }
        const { ok } = await apiRequest(client, '/users/@me/settings', {
            method: 'PATCH',
            body: { status: data.status }
        });
        if (!ok) return fail(cb, 'Could not update status');
        cb({ ok: true });
    } catch (e) {
        console.error('SetPresence Error:', e.message);
        fail(cb, 'Could not update status');
    }
};

const setCustomStatus = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data)) return fail(cb, 'Invalid request');
    const text = typeof data.text === 'string' ? cleanText(data.text, 128).trim() : '';
    try {
        if (client.user?.bot && typeof client.user.setPresence === 'function') {
            client.user.setPresence({ activities: text ? [{ name: text }] : [] });
            return cb({ ok: true });
        }
        const { ok } = await apiRequest(client, '/users/@me/settings', {
            method: 'PATCH',
            body: { custom_status: text ? { text } : null }
        });
        if (!ok) return fail(cb, 'Could not update custom status');
        cb({ ok: true });
    } catch (e) {
        console.error('SetCustomStatus Error:', e.message);
        fail(cb, 'Could not update custom status');
    }
};

const updateSelfProfile = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data)) return fail(cb, 'Invalid request');
    try {
        if (client.user?.bot) return fail(cb, 'Bot profiles cannot be edited here');

        // PATCH /users/@me/profile: bio / pronouns
        const profileBody = {};
        if (data.bio !== undefined) profileBody.bio = cleanText(data.bio, 190).trim();
        if (data.pronouns !== undefined) profileBody.pronouns = cleanText(data.pronouns, 40).trim();
        if (Object.keys(profileBody).length) {
            const { ok, status } = await apiRequest(client, '/users/@me/profile', { method: 'PATCH', body: profileBody });
            if (!ok) return fail(cb, status === 403 ? 'Profile could not be updated' : 'Could not update profile');
        }

        // PATCH /users/@me: display name / avatar / banner (data URI)
        const selfBody = {};
        if (data.displayName !== undefined) {
            const name = cleanText(data.displayName, 32).trim();
            if (name.length < 1) return fail(cb, 'Display name is too short');
            selfBody.global_name = name;
        }
        if (typeof data.avatar === 'string' && data.avatar.startsWith('data:image/')) selfBody.avatar = data.avatar;
        if (typeof data.banner === 'string' && data.banner.startsWith('data:image/')) selfBody.banner = data.banner;
        if (data.removeAvatar === true) selfBody.avatar = null;
        if (data.removeBanner === true) selfBody.banner = null;
        if (Object.keys(selfBody).length) {
            const { ok, status } = await apiRequest(client, '/users/@me', { method: 'PATCH', body: selfBody });
            if (!ok) return fail(cb, status === 400 ? 'Could not update account (name may be taken)' : status === 403 ? 'Account could not be updated' : 'Could not update account');
        }

        if (!Object.keys(profileBody).length && !Object.keys(selfBody).length) return fail(cb, 'Nothing to update');
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateSelfProfile Error:', e.message);
        fail(cb, 'Could not update profile');
    }
};

const EVENTS = [
    'createDM', 'createGroupDM', 'updateGroupDM', 'addGroupRecipient', 'removeGroupRecipient', 'leaveGroupDM',
    'sendFriendRequest', 'removeRelationship', 'blockUser', 'unblockUser',
    'setPresence', 'setCustomStatus', 'updateSelfProfile', 'getSessions', 'logoutSession'
];

module.exports = (io) => {
    const register = (socket) => {
        socket.on('createDM', (data, cb) => createDM(socket, data, safeAck(cb)));
        socket.on('createGroupDM', (data, cb) => createGroupDM(socket, data, safeAck(cb)));
        socket.on('updateGroupDM', (data, cb) => updateGroupDM(socket, data, safeAck(cb)));
        socket.on('addGroupRecipient', (data, cb) => groupRecipient('PUT')(socket, data, safeAck(cb)));
        socket.on('removeGroupRecipient', (data, cb) => groupRecipient('DELETE')(socket, data, safeAck(cb)));
        socket.on('leaveGroupDM', (data, cb) => leaveGroupDM(socket, data, safeAck(cb)));
        socket.on('sendFriendRequest', (data, cb) => sendFriendRequest(socket, data, safeAck(cb)));
        socket.on('removeRelationship', (data, cb) => removeRelationship(socket, data, safeAck(cb)));
        socket.on('blockUser', (data, cb) => blockUser(true)(socket, data, safeAck(cb)));
        socket.on('unblockUser', (data, cb) => blockUser(false)(socket, data, safeAck(cb)));
        socket.on('setPresence', (data, cb) => setPresence(socket, data, safeAck(cb)));
        socket.on('setCustomStatus', (data, cb) => setCustomStatus(socket, data, safeAck(cb)));
        socket.on('updateSelfProfile', (data, cb) => updateSelfProfile(socket, data, safeAck(cb)));
        socket.on('getSessions', (data, cb) => getSessions(socket, data, safeAck(cb)));
        socket.on('logoutSession', (data, cb) => logoutSession(socket, data, safeAck(cb)));
    };
    return { register, events: EVENTS };
};
