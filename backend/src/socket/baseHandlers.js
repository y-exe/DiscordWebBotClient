const {
    isSnowflake,
    cleanText,
    publicError,
    safeAck,
    parseAttachment,
    discordFetch,
    snowflakeToTimestamp,
} = require('../utils/helpers');
const {
    MAX_MESSAGE_LENGTH,
    MAX_FILES,
    MAX_TOTAL_FILE_BYTES,
    COMMAND_NAME_RE,
} = require('../config');
const {
    getUserDisplayName,
    getUserAvatar,
    formatSticker,
    formatMessageWithReference,
} = require('../services/formatter');
const { sessions } = require('../services/session');
const { getDMChannels, getFriends, getChannelsWithMembers } = require('../services/discord');

const mapCommandOptions = (options = []) =>
    options.map((opt) => ({
        name: opt.name,
        description: opt.description || '',
        type: opt.type,
        required: opt.required || false,
        choices: (opt.choices || []).map((c) => ({ name: c.name, value: c.value })),
        ...(Array.isArray(opt.options) ? { options: mapCommandOptions(opt.options) } : {}),
    }));

// interaction 送信用にオプション値を型ごとに正規化
const normalizeSlashOptionValue = (type, value) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (type === 4 || type === 10) {
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
    }
    if (type === 5) return value === true || value === 'true' || value === 1 || value === '1';
    return String(value);
};

const normalizeSlashOptions = (options = []) =>
    options
        .map((opt) => {
            const type = Number(opt.type) || 3;
            if (type === 1 || type === 2) {
                return { name: opt.name, type, options: normalizeSlashOptions(opt.options) };
            }
            const value = normalizeSlashOptionValue(type, opt.value);
            return value === undefined ? null : { name: opt.name, type, value };
        })
        .filter(Boolean);

const register = (socket) => {
    socket.on('getGuilds', (cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        cb(
            client.guilds.cache.map((g) => ({
                id: g.id,
                name: g.name,
                icon: g.iconURL({ format: 'png' }),
                banner: g.bannerURL ? g.bannerURL({ dynamic: true, format: 'png', size: 1024 }) : null,
                acronym: g.name
                    .replace(/\w+/g, (n) => n[0])
                    .slice(0, 3)
                    .toUpperCase(),
            })),
        );
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
                return cb([{ id: 'dms', name: 'ダイレクトメッセージ', channels: dms }]);
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
        cb(
            guild.emojis.cache.map((emoji) => ({
                id: emoji.id,
                name: emoji.name,
                animated: emoji.animated,
                url:
                    emoji.url ||
                    `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48`,
            })),
        );
    });

    socket.on('getAllGuildEmojis', (cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb([]);
        const groups = Array.from(client.guilds.cache.values())
            .map((guild) => {
                const emojis = guild.emojis.cache.map((emoji) => ({
                    id: emoji.id,
                    name: emoji.name,
                    animated: emoji.animated,
                    url:
                        emoji.url ||
                        `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=48`,
                }));
                return {
                    guildId: guild.id,
                    guildName: guild.name,
                    guildIcon: guild.iconURL ? guild.iconURL({ format: 'png', size: 64 }) : null,
                    emojis,
                };
            })
            .filter((group) => group.emojis.length > 0);
        cb(groups);
    });

    socket.on('getGuildStickers', async (guildId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me' || !isSnowflake(guildId)) return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        if ((!guild.stickers?.cache || guild.stickers.cache.size === 0) && guild.stickers?.fetch) {
            try {
                await guild.stickers.fetch();
            } catch (e) {}
        }
        cb(guild.stickers?.cache?.map(formatSticker).filter(Boolean) || []);
    });

    socket.on('getGuildRoles', async (guildId, cb) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client || guildId === '@me' || !isSnowflake(guildId)) return cb([]);
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return cb([]);
        if ((!guild.roles?.cache || guild.roles.cache.size === 0) && guild.roles?.fetch) {
            try {
                await guild.roles.fetch();
            } catch (e) {}
        }
        cb(
            guild.roles?.cache
                ?.map((r) => ({
                    id: r.id,
                    name: r.name,
                    color: r.hexColor === '#000000' ? null : r.hexColor,
                    position: r.position,
                    hoist: Boolean(r.hoist),
                    permissions: r.permissions != null ? BigInt(r.permissions).toString() : '0',
                }))
                .filter((r) => r.id !== guild.id) || [],
        );
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
            const ch = client.channels.cache.get(channelId) || (await client.channels.fetch(channelId));
            if (!ch || !ch.messages) return cb([]);
            const fetchOptions = { limit: 50 };
            if (before) fetchOptions.before = before;
            const msgs = await ch.messages.fetch(fetchOptions);

            const formatted = await Promise.all(
                Array.from(msgs.values())
                    .reverse()
                    .map((m) => {
                        const raw = getRawMessage(client, m.id);
                        return formatMessageWithReference(m, raw);
                    }),
            );
            cb(formatted.filter((m) => m));
        } catch (e) {
            console.error('GetMessages Error:', e.message);
            cb([]);
        }
    });

    socket.on('sendMessage', async (d, cb = () => {}) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        if (!isPlainObject(d) || !isSnowflake(d.channelId)) return cb(publicError('Invalid request'));
        try {
            const ch = await client.channels.fetch(d.channelId);
            if (!ch) return cb({ ok: false, error: 'Channel not found' });

            if (d.files !== undefined && !Array.isArray(d.files))
                return cb(publicError('Invalid attachments'));
            if ((d.files?.length || 0) > MAX_FILES)
                return cb(publicError(`Up to ${MAX_FILES} files are allowed`));
            const files = (d.files || []).map(parseAttachment);
            if (files.reduce((sum, file) => sum + file.attachment.length, 0) > MAX_TOTAL_FILE_BYTES) {
                return cb(publicError('Attachments are too large'));
            }

            if (d.reply?.messageId && !isSnowflake(d.reply.messageId))
                return cb(publicError('Invalid reply'));
            const replyOptions = d.reply?.messageId
                ? {
                        reply: {
                            messageReference: d.reply.messageId,
                            failIfNotExists: false,
                        },
                        allowedMentions: {
                            repliedUser: d.reply.mention !== false,
                        },
                    }
                : {};
            if (d.content !== undefined && typeof d.content !== 'string')
                return cb(publicError('Invalid message'));
            if ((d.content || '').length > MAX_MESSAGE_LENGTH)
                return cb(publicError('Message is too long'));
            const content = cleanText(d.content || '', MAX_MESSAGE_LENGTH).trim();
            const stickers = Array.isArray(d.stickers) ? d.stickers.filter(isSnowflake).slice(0, 3) : [];
            const payload = { ...replyOptions };
            if (files.length > 0) payload.files = files;
            if (stickers.length > 0) payload.stickers = stickers;
            if (content) payload.content = content;
            if (!payload.content && !payload.files && !payload.stickers)
                return cb({ ok: false, error: 'Message is empty' });

            await ch.send(payload);
            return cb({ ok: true, files: files.length, stickers: stickers.length });
        } catch (e) {
            console.error('SendMessage Error:', e.message);
            cb(
                publicError(
                    e.message === 'invalid_attachment' ? 'Invalid attachment' : 'Message could not be sent',
                ),
            );
        }
    });

    socket.on('getUserProfile', async (payload = {}, cb = () => {}) => {
        cb = safeAck(cb);
        const { userId, guildId } = isPlainObject(payload) ? payload : {};
        const client = sessions.get(socket.id);
        if (!client) return cb({ error: 'Not logged in' });
        if (!isSnowflake(userId) || (guildId && guildId !== '@me' && !isSnowflake(guildId)))
            return cb({ error: 'Invalid request' });

        try {
            let user = client.users.cache.get(userId);
            if (!user) {
                user = await Promise.race([
                    client.users.fetch(userId),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('User lookup timed out')), 4000),
                    ),
                ]);
            }

            const guild = guildId && guildId !== '@me' ? client.guilds.cache.get(guildId) : null;
            let member = guild?.members?.cache?.get(userId) || null;
            if (guild && !member) {
                try {
                    member = await Promise.race([
                        guild.members.fetch(userId),
                        new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
                    ]);
                } catch {}
            }

            let apiProfile = null;
            try {
                apiProfile = await Promise.race([
                    client.api.users(userId).profile.get({
                        query: { with_mutual_guilds: false, with_mutual_friends_count: false },
                    }),
                    new Promise((resolve) => setTimeout(() => resolve(null), 3500)),
                ]);
            } catch {}

            const profileUser = apiProfile?.user || user;
            const profileData = apiProfile?.user_profile || apiProfile?.userProfile || {};
            const guildProfile = apiProfile?.guild_member_profile || apiProfile?.guildMemberProfile || {};
            const presence =
                member?.presence ||
                user.presence ||
                client.presence?.cache?.get?.(userId) ||
                client.presences?.cache?.get?.(userId);
            const bannerHash = profileData.banner || profileUser?.banner;
            const banner = bannerHash
                ? `https://cdn.discordapp.com/banners/${userId}/${bannerHash}.${String(bannerHash).startsWith('a_') ? 'gif' : 'png'}?size=1024`
                : typeof user.bannerURL === 'function'
                    ? user.bannerURL({ dynamic: true, size: 1024 })
                    : null;

            cb({
                id: user.id,
                username: user.username,
                globalName: user.globalName || user.global_name || profileUser?.global_name,
                displayName: getUserDisplayName(user, member),
                avatar:
                    member?.avatarURL?.({ dynamic: true, size: 512 }) ||
                    getUserAvatar(user, { dynamic: true, format: 'png', size: 512 }),
                banner,
                accentColor:
                    profileData.accent_color || profileData.accentColor || user.hexAccentColor || null,
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
                    : [],
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
                        themeColors: profile.themeColors,
                    };
                } catch (e) {}
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
                        roles: member.roles.cache.map((r) => ({ id: r.id, name: r.name, color: r.hexColor })),
                        joinedAt: member.joinedTimestamp,
                        premiumSince: member.premiumSinceTimestamp,
                        guildAvatarURL: member.avatarURL
                            ? member.avatarURL({ dynamic: true, size: 1024 })
                            : null,
                        communicationDisabledUntil: member.communicationDisabledUntilTimestamp,
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
                bannerURL: user.bannerURL
                    ? user.bannerURL({ dynamic: true, format: 'png', size: 1024 })
                    : null,
                accentColor: user.hexAccentColor,
                bot: user.bot,
                system: user.system,
                flags: user.flags ? user.flags.toArray() : [],
                createdAt: user.createdTimestamp,
                ...profileData,
                serverProfiles,
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
        if (
            !isPlainObject(data) ||
            !isSnowflake(data.channelId) ||
            !isSnowflake(data.messageId) ||
            typeof data.emoji !== 'string' ||
            !data.emoji ||
            data.emoji.length > 128
        ) {
            return cb(publicError('Invalid request'));
        }
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;
            const emojiParam = encodeURIComponent(data.emoji);
            const response = await discordFetch(
                `https://discord.com/api/v10/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}/@me`,
                { method: 'PUT', headers: { Authorization: authHeader } },
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
        if (
            !isPlainObject(data) ||
            !isSnowflake(data.channelId) ||
            !isSnowflake(data.messageId) ||
            typeof data.emoji !== 'string' ||
            !data.emoji ||
            data.emoji.length > 128
        ) {
            return cb(publicError('Invalid request'));
        }
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;
            const emojiParam = encodeURIComponent(data.emoji);
            const response = await discordFetch(
                `https://discord.com/api/v10/channels/${data.channelId}/messages/${data.messageId}/reactions/${emojiParam}/@me`,
                { method: 'DELETE', headers: { Authorization: authHeader } },
            );
            cb({ ok: response.ok || response.status === 204 });
        } catch (e) {
            console.error('RemoveReaction Error:', e.message);
            cb(publicError('Reaction could not be removed'));
        }
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
                const response = await discordFetch(apiUrl, { headers: { Authorization: authHeader } });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data.applications)) {
                        const appCmdsList = await Promise.all(
                            data.applications.map(async (app) => {
                                if (!app?.id || !isSnowflake(app.id) || !isSnowflake(guildId)) return [];
                                try {
                                    const cmdsResponse = await discordFetch(
                                        `https://discord.com/api/v10/applications/${app.id}/guilds/${guildId}/commands`,
                                        { headers: { Authorization: authHeader } },
                                    );
                                    if (cmdsResponse.ok) {
                                        const cmds = await cmdsResponse.json();
                                        if (Array.isArray(cmds)) {
                                            return cmds.map((cmd) => ({
                                                id: cmd.id,
                                                name: cmd.name,
                                                description: cmd.description || '',
                                                type: cmd.type,
                                                applicationId: app.id,
                                                application_name: app.name || app.bot?.username || '',
                                                version: cmd.version,
                                                options: mapCommandOptions(cmd.options),
                                            }));
                                        }
                                    }
                                } catch (e) {}
                                return [];
                            }),
                        );
                        commands.push(...appCmdsList.flat());
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
                        const list =
                            jsCommands instanceof Map
                                ? Array.from(jsCommands.values())
                                : Array.isArray(jsCommands)
                                    ? jsCommands
                                    : [];
                        commands = list.map((cmd) => ({
                            id: cmd.id,
                            name: cmd.name,
                            description: cmd.description || '',
                            type: cmd.type,
                            applicationId: cmd.applicationId,
                            version: cmd.version,
                            options: mapCommandOptions(cmd.options),
                        }));
                    }
                } catch (e) {}
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
        if (
            !isPlainObject(data) ||
            !isSnowflake(data.channelId) ||
            !isSnowflake(data.commandId) ||
            !COMMAND_NAME_RE.test(data.commandName || '') ||
            (data.guildId && data.guildId !== '@me' && !isSnowflake(data.guildId))
        ) {
            return cb(publicError('Invalid request'));
        }
        try {
            const ch = await client.channels.fetch(data.channelId);
            if (!ch) return cb({ ok: false, error: 'Channel not found' });

            if (client.user.bot) {
                // Bot トークンでは interaction を起こせないためコマンドメンションのみ送る
                await ch.send({ content: `</${data.commandName}:${data.commandId}>` });
                return cb({ ok: true });
            }

            if (!isSnowflake(data.applicationId)) return cb(publicError('Invalid request'));
            const payload = {
                type: 2,
                application_id: data.applicationId,
                guild_id: data.guildId && data.guildId !== '@me' ? data.guildId : null,
                channel_id: data.channelId,
                session_id: client.sessionId || 'session_id',
                nonce: String(Date.now() * 2 ** 22),
                data: {
                    version: String(data.version || '1'),
                    id: data.commandId,
                    name: data.commandName,
                    type: 1,
                    options: normalizeSlashOptions(data.options),
                    attachments: [],
                },
            };
            const response = await discordFetch('https://discord.com/api/v10/interactions', {
                method: 'POST',
                headers: { Authorization: client.token, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => null);
                return cb({ ok: false, error: body?.message || 'Command could not be sent' });
            }
            return cb({ ok: true });
        } catch (e) {
            console.error('SendSlashCommand Error:', e.message);
            cb(publicError('Command could not be sent'));
        }
    });

    socket.on('interaction', async (data, cb = () => {}) => {
        cb = safeAck(cb);
        const client = sessions.get(socket.id);
        if (!client) return cb({ ok: false, error: 'Not logged in' });
        if (
            !isPlainObject(data) ||
            !['modal', 'button', 'select'].includes(data.type) ||
            !isSnowflake(data.channelId) ||
            (data.guildId && data.guildId !== '@me' && !isSnowflake(data.guildId))
        ) {
            return cb(publicError('Invalid request'));
        }
        try {
            const token = client.token;
            const isBot = !!client.user?.bot;
            const authHeader = isBot ? `Bot ${token}` : token;

            if (data.type === 'button') {
                const payload = {
                    type: 3,
                    guild_id: data.guildId && data.guildId !== '@me' ? data.guildId : null,
                    channel_id: data.channelId,
                    message_id: data.messageId,
                    application_id: data.applicationId,
                    data: {
                        component_type: 2,
                        custom_id: data.customId,
                    },
                    session_id: client.sessionId || 'session_id',
                };
                const response = await discordFetch(`https://discord.com/api/v10/interactions`, {
                    method: 'POST',
                    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                return cb({ ok: response.ok });
            }

            if (data.type === 'select') {
                const payload = {
                    type: 3,
                    guild_id: data.guildId && data.guildId !== '@me' ? data.guildId : null,
                    channel_id: data.channelId,
                    message_id: data.messageId,
                    application_id: data.applicationId,
                    data: {
                        component_type: 3,
                        custom_id: data.customId,
                        values: Array.isArray(data.values) ? data.values : [data.values],
                    },
                    session_id: client.sessionId || 'session_id',
                };
                const response = await discordFetch(`https://discord.com/api/v10/interactions`, {
                    method: 'POST',
                    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                return cb({ ok: response.ok });
            }

            if (data.type === 'modal') {
                const payload = {
                    type: 5,
                    guild_id: data.guildId && data.guildId !== '@me' ? data.guildId : null,
                    channel_id: data.channelId,
                    application_id: data.applicationId,
                    data: {
                        custom_id: data.customId,
                        components: data.components,
                    },
                    session_id: client.sessionId || 'session_id',
                };
                const response = await discordFetch(`https://discord.com/api/v10/interactions`, {
                    method: 'POST',
                    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                return cb({ ok: response.ok });
            }

            cb({ ok: false, error: 'Unknown interaction type' });
        } catch (e) {
            console.error('Interaction Error:', e.message);
            cb(publicError('Interaction failed'));
        }
    });
};

module.exports = { register };
