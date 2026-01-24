const {
    getClient,
    fail,
    apiRequest,
    cacheFor,
    validateImage,
    isSnowflake,
    isPlainObject,
    cleanText,
    safeAck
} = require('./common');

const GUILD_NAME_MAX = 100;
const DESCRIPTION_MAX = 120;

const createGuild = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data)) return fail(cb, 'Invalid request');
    const name = cleanText(data.name, GUILD_NAME_MAX).trim();
    if (!name) return fail(cb, 'Server name is required');
    const icon = data.icon ? validateImage(data.icon, 1024 * 1024) : null;
    if (data.icon && !icon) return fail(cb, 'Invalid icon image');
    try {
        const { ok, data: guild, status } = await apiRequest(client, '/guilds', { method: 'POST', body: { name, ...(icon ? { icon } : {}) } });
        if (!ok || !guild?.id) return fail(cb, status === 400 ? 'Could not create server (captcha required?)' : 'Could not create server');
        cb({ ok: true, guild: { id: guild.id, name: guild.name, icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null } });
    } catch (e) {
        console.error('CreateGuild Error:', e.message);
        fail(cb, 'Could not create server');
    }
};

const getGuild = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const guild = client.guilds.cache.get(data.guildId);
    if (!guild) return fail(cb, 'Guild not found');
    const resolveMyPermissions = async () => {
        try {
            if (guild.ownerId === client.user?.id) return 8n; // オーナーは管理者権限扱い
            const me = guild.members?.me ?? guild.me;
            if (me?.permissions != null) return BigInt(me.permissions);
            // キャッシュに自己メンバーが無い(セルフボットでよくある)場合は取得する
            const member = await guild.members.fetch(client.user.id).catch(() => null);
            return member?.permissions ? BigInt(member.permissions) : 0n;
        } catch {
            return 0n;
        }
    };
    try {
        // サーバー情報のRESTは30秒キャッシュ(ギルド切替のたびの呼び出しを抑制)
        const { data: raw, ok } = await cacheFor(client, `guild-info-${data.guildId}`, 30_000, () => apiRequest(client, `/guilds/${data.guildId}?with_counts=true`));
        const source = ok && raw?.id ? raw : guild;
        cb({
            ok: true,
            guild: {
                id: guild.id,
                name: source.name ?? guild.name,
                icon: guild.iconURL ? guild.iconURL({ format: 'png', size: 256 }) : null,
                banner: guild.bannerURL ? guild.bannerURL({ format: 'png', size: 1024 }) : null,
                description: source.description ?? guild.description ?? null,
                ownerId: source.owner_id ?? guild.ownerId,
                isOwner: (source.owner_id ?? guild.ownerId) === client.user?.id,
                myPermissions: (await resolveMyPermissions()).toString(),
                memberCount: source.approximate_member_count ?? guild.memberCount ?? null,
                onlineCount: source.approximate_presence_count ?? null,
                premiumTier: source.premium_tier ?? guild.premiumTier ?? 0,
                verificationLevel: source.verification_level ?? guild.verificationLevel ?? 0,
                systemChannelId: source.system_channel_id ?? guild.systemChannelId ?? null,
                rulesChannelId: source.rules_channel_id ?? guild.rulesChannelId ?? null,
                features: source.features ?? guild.features ?? [],
                createdAt: guild.createdTimestamp ?? null
            }
        });
    } catch (e) {
        console.error('GetGuild Error:', e.message);
        cb({
            ok: true,
            guild: {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL ? guild.iconURL({ format: 'png', size: 256 }) : null,
                banner: guild.bannerURL ? guild.bannerURL({ format: 'png', size: 1024 }) : null,
                description: guild.description ?? null,
                ownerId: guild.ownerId,
                isOwner: guild.ownerId === client.user?.id,
                myPermissions: (await resolveMyPermissions()).toString(),
                memberCount: guild.memberCount ?? null,
                onlineCount: null,
                premiumTier: guild.premiumTier ?? 0,
                verificationLevel: guild.verificationLevel ?? 0,
                features: guild.features ?? [],
                createdAt: guild.createdTimestamp ?? null
            }
        });
    }
};

const updateGuild = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const body = {};
    if (data.name !== undefined) {
        const name = cleanText(data.name, GUILD_NAME_MAX).trim();
        if (!name) return fail(cb, 'Server name is required');
        body.name = name;
    }
    if (data.description !== undefined) {
        const description = cleanText(data.description, DESCRIPTION_MAX).trim();
        body.description = description || null;
    }
    if (data.icon !== undefined) {
        if (data.icon === null) body.icon = null;
        else {
            const icon = validateImage(data.icon, 1024 * 1024);
            if (!icon) return fail(cb, 'Invalid icon image');
            body.icon = icon;
        }
    }
    if (data.banner !== undefined) {
        if (data.banner === null) body.banner = null;
        else {
            const banner = validateImage(data.banner, 1024 * 1024);
            if (!banner) return fail(cb, 'Invalid banner image');
            body.banner = banner;
        }
    }
    if (Number.isInteger(data.verificationLevel) && data.verificationLevel >= 0 && data.verificationLevel <= 4) body.verification_level = data.verificationLevel;
    if (data.systemChannelId !== undefined) {
        if (data.systemChannelId === null) body.system_channel_id = null;
        else if (isSnowflake(data.systemChannelId)) body.system_channel_id = data.systemChannelId;
    }
    if (!Object.keys(body).length) return fail(cb, 'Nothing to update');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}`, { method: 'PATCH', body });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update server');
        const guild = client.guilds.cache.get(data.guildId);
        if (guild?.fetch) guild.fetch().catch(() => { });
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateGuild Error:', e.message);
        fail(cb, 'Could not update server');
    }
};

const deleteGuild = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/guilds/${data.guildId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'You are not the owner of this server' : 'Could not delete server');
        cb({ ok: true });
    } catch (e) {
        console.error('DeleteGuild Error:', e.message);
        fail(cb, 'Could not delete server');
    }
};

const leaveGuild = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    try {
        const { ok, status } = await apiRequest(client, `/users/@me/guilds/${data.guildId}`, { method: 'DELETE' });
        if (!ok) return fail(cb, status === 403 ? 'Use server deletion when you are the owner' : 'Could not leave server');
        cb({ ok: true });
    } catch (e) {
        console.error('LeaveGuild Error:', e.message);
        fail(cb, 'Could not leave server');
    }
};

/**
 * 全ギルドの自分の権限を一括取得(管理UIの出し分け用)。
 * GET /users/@me/guilds はユーザー/ボット両トークンで各ギルドの permissions を返す。
 * このエンドポイントはレート制限が厳しいため結果を60秒キャッシュし、
 * 失敗時は直近の正常値を返す(0に落ちて管理UIが消えるのを防ぐ)。
 */
const getSelfPermissions = async (socket, cb) => {
    const client = getClient(socket);
    if (!client) return fail(cb, 'Not logged in');

    // フォールバック: 各ギルドで自分のメンバー情報を取得して権限を算出
    const computeFromMembers = async () => {
        const result = {};
        for (const guild of client.guilds.cache.values()) {
            try {
                if (guild.ownerId === client.user?.id) {
                    result[guild.id] = '8';
                    continue;
                }
                const member = await guild.members.fetch(client.user.id).catch(() => null);
                result[guild.id] = member?.permissions ? BigInt(member.permissions).toString() : '0';
            } catch {
                result[guild.id] = '0';
            }
        }
        return result;
    };

    try {
        const permissions = await cacheFor(client, 'self-permissions', 60_000, async () => {
            const response = await apiRequest(client, '/users/@me/guilds', { query: { with_counts: 'false' } });
            if (!response.ok || !Array.isArray(response.data)) {
                console.warn(`[Auth] getSelfPermissions: REST failed (HTTP ${response.status})`);
                throw new Error(`guilds REST failed (HTTP ${response.status})`);
            }
            const result = {};
            for (const guild of response.data) {
                if (!guild?.id) continue;
                if (guild.owner === true) result[guild.id] = '8';
                else if (guild.permissions != null) {
                    try { result[guild.id] = BigInt(guild.permissions).toString(); } catch { result[guild.id] = '0'; }
                }
            }
            if (Object.keys(result).length === 0) throw new Error('empty permissions');
            return result;
        });
        return cb({ ok: true, permissions });
    } catch (e) {
        console.warn(`[Auth] getSelfPermissions: REST fallback to member fetch (${e.message})`);
    }

    // RESTが失敗(429など)したらメンバー取得ベースで計算(5分キャッシュ)
    try {
        const permissions = await cacheFor(client, 'self-permissions-computed', 300_000, computeFromMembers);
        const hasRealPermissions = Object.values(permissions).some((value) => value > 0);
        if (hasRealPermissions) {
            return cb({ ok: true, permissions, stale: true });
        }
        console.warn('[Auth] getSelfPermissions: computed map had no permissions (likely rate limited)');
    } catch (e) {
        console.error('GetSelfPermissions compute error:', e.message);
    }

    // 直近の正常値があればそれを返す(0への退行を防ぐ)
    const cache = client._apiCache?.get('self-permissions');
    if (cache?.value && Object.keys(cache.value).length > 0) {
        return cb({ ok: true, permissions: cache.value, stale: true });
    }
    cb({ ok: false, error: 'Could not load permissions' });
};


/**
 * 自分のサーバーごとの設定 (通知・ミュート) を取得
 */
const getSelfGuildSettings = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    try {
        const { ok, data: settings, status } = await cacheFor(client, `self-guild-settings-${data.guildId}`, 15_000, () => apiRequest(client, `/users/@me/guilds/${data.guildId}/settings`));
        if (!ok || !settings) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not load settings');
        cb({
            ok: true,
            settings: {
                muted: Boolean(settings.muted),
                muteConfig: settings.mute_config ? {
                    endTime: settings.mute_config.end_time ? Date.parse(settings.mute_config.end_time) : null,
                    selectedTimeWindow: settings.mute_config.selected_time_window ?? null,
                } : null,
                messageNotifications: Number.isInteger(settings.message_notifications) ? settings.message_notifications : null,
                suppressEveryone: Boolean(settings.suppress_everyone),
                suppressRoles: Boolean(settings.suppress_roles),
                channelOverrides: Object.fromEntries(
                    Object.entries(settings.channel_overrides || {})
                        .filter(([, override]) => override && typeof override === 'object')
                        .map(([channelId, override]) => [channelId, {
                            muted: Boolean(override.muted),
                            messageNotifications: Number.isInteger(override.message_notifications) ? override.message_notifications : null,
                        }]),
                ),
            },
        });
    } catch (e) {
        console.error('GetSelfGuildSettings Error:', e.message);
        fail(cb, 'Could not load settings');
    }
};

/**
 * チャンネルごとの自分の設定 (通知・ミュート) を更新
 */
const updateSelfChannelSettings = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId) || !isSnowflake(data.channelId)) return fail(cb, 'Invalid request');
    try {
        const { ok, data: settings } = await apiRequest(client, `/users/@me/guilds/${data.guildId}/settings`);
        if (!ok || !settings) return fail(cb, 'Could not load settings');

        const override = { muted: Boolean(settings.channel_overrides?.[data.channelId]?.muted) };
        if (data.mute !== undefined) {
            override.muted = data.mute !== false && data.mute !== null;
        }
        if (data.messageNotifications !== undefined) {
            // null はサーバーの既定へ戻す
            override.message_notifications = data.messageNotifications === null ? null : data.messageNotifications;
        } else if (Number.isInteger(settings.channel_overrides?.[data.channelId]?.message_notifications)) {
            override.message_notifications = settings.channel_overrides[data.channelId].message_notifications;
        }

        const overrides = { ...(settings.channel_overrides || {}) };
        overrides[data.channelId] = override;

        const { ok: patchOk, status } = await apiRequest(client, `/users/@me/guilds/${data.guildId}/settings`, {
            method: 'PATCH',
            body: { channel_overrides: overrides },
        });
        if (!patchOk) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update settings');
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateSelfChannelSettings Error:', e.message);
        fail(cb, 'Could not update settings');
    }
};

/**
 * サーバー全体を既読にする (Stoat の Mark as read)
 */
const ackGuild = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    try {
        const { ok } = await apiRequest(client, `/guilds/${data.guildId}/ack`, { method: 'POST', body: {} });
        cb({ ok });
    } catch (e) {
        console.error('AckGuild Error:', e.message);
        cb({ ok: false });
    }
};

/**
 * サーバーごとの自分の設定 (通知・ミュート) を更新
 */
const updateSelfGuildSettings = async (socket, data, cb) => {
    const client = getClient(socket);
    if (!isPlainObject(data) || !isSnowflake(data.guildId)) return fail(cb, 'Invalid request');
    const body = {};
    if (data.muted !== undefined) body.muted = Boolean(data.muted);
    if (data.mute !== undefined) {
        if (data.mute === false || data.mute === 0) {
            body.muted = false;
        } else {
            const seconds = Number(data.mute);
            body.muted = true;
            if (Number.isFinite(seconds) && seconds > 0) {
                body.mute_config = {
                    selected_time_window: Math.min(Math.max(Math.round(seconds), 0), 604800),
                    end_time: new Date(Date.now() + seconds * 1000).toISOString(),
                };
            }
        }
    }
    if (Number.isInteger(data.messageNotifications) && [0, 1, 2].includes(data.messageNotifications)) {
        body.message_notifications = data.messageNotifications;
    }
    if (Array.isArray(data.channelOverrides)) {
        body.channel_overrides = Object.fromEntries(
            data.channelOverrides
                .filter((entry) => isPlainObject(entry) && isSnowflake(entry.channelId))
                .slice(0, 100)
                .map((entry) => [entry.channelId, {
                    muted: Boolean(entry.muted),
                    ...(Number.isInteger(entry.messageNotifications) && [0, 1, 2].includes(entry.messageNotifications) ? { message_notifications: entry.messageNotifications } : {})
                }])
        );
    }
    if (!Object.keys(body).length) return fail(cb, 'Nothing to update');
    try {
        const { ok, status } = await apiRequest(client, `/users/@me/guilds/${data.guildId}/settings`, { method: 'PATCH', body });
        if (!ok) return fail(cb, status === 403 ? 'Missing permissions' : 'Could not update settings');
        cb({ ok: true });
    } catch (e) {
        console.error('UpdateSelfGuildSettings Error:', e.message);
        fail(cb, 'Could not update settings');
    }
};

const EVENTS = [
    'createGuild', 'getGuild', 'updateGuild', 'deleteGuild', 'leaveGuild',
    'getGuildMembers', 'searchGuildMembers', 'getRoleMembers', 'kickMember', 'banMember', 'unbanMember', 'getGuildBans', 'updateMember',
    'getGuildInvites', 'createInvite', 'deleteInvite', 'getInviteInfo', 'joinGuild',
    'createRole', 'updateRole', 'deleteRole', 'updateRolePositions',
    'getGuildAuditLogs', 'createEmoji', 'updateEmoji', 'deleteEmoji',
    'getSelfPermissions', 'getSelfGuildSettings', 'updateSelfGuildSettings', 'updateSelfChannelSettings', 'ackGuild', 'createSticker', 'deleteSticker'
];

const membersModule = require('./guildMembers');
const invitesModule = require('./guildInvites');
const rolesModule = require('./guildRoles');
const expressionsModule = require('./guildExpressions');

module.exports = (io) => {
    const register = (socket) => {
        membersModule.register(socket);
        invitesModule.register(socket);
        rolesModule.register(socket);
        expressionsModule.register(socket);
        socket.on('createGuild', (data, cb) => createGuild(socket, data, safeAck(cb)));
        socket.on('getGuild', (data, cb) => getGuild(socket, data, safeAck(cb)));
        socket.on('updateGuild', (data, cb) => updateGuild(socket, data, safeAck(cb)));
        socket.on('deleteGuild', (data, cb) => deleteGuild(socket, data, safeAck(cb)));
        socket.on('leaveGuild', (data, cb) => leaveGuild(socket, data, safeAck(cb)));
        socket.on('getSelfPermissions', (cb) => getSelfPermissions(socket, safeAck(cb)));
        socket.on('updateSelfGuildSettings', (data, cb) => updateSelfGuildSettings(socket, data, safeAck(cb)));
        socket.on('getSelfGuildSettings', (data, cb) => getSelfGuildSettings(socket, data, safeAck(cb)));
        socket.on('updateSelfChannelSettings', (data, cb) => updateSelfChannelSettings(socket, data, safeAck(cb)));
        socket.on('ackGuild', (data, cb) => ackGuild(socket, data, safeAck(cb)));
    };
    return { register, events: EVENTS };
};
