const {
    getDirectDisplayName,
    getUserAvatar,
    formatMessageWithReference,
} = require('../services/formatter');
const { sessions, loginQueue } = require('../services/session');

const saveRawMessage = (client, id, data) => {
    if (!client || !id || !data) return;
    if (!client.rawMessageCache) client.rawMessageCache = new Map();
    const cache = client.rawMessageCache;
    if (cache.has(id)) cache.delete(id);
    cache.set(id, data);
    if (cache.size > 200) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
    }
};

const getRawMessage = (client, id) => client?.rawMessageCache?.get(id) || null;

const attachClientEvents = (socket, client) => {
    const handleReady = () => {
        loginQueue.delete(socket.id);
        if (sessions.has(socket.id)) return;

        console.log(`[Auth] Ready: ${client.user.tag}`);
        sessions.set(socket.id, client);
        socket.emit('login-success', {
            isBot: !!client.user.bot,
            user: {
                id: client.user.id,
                username: client.user.username,
                displayName: getDirectDisplayName(client.user),
                globalName: client.user.globalName || client.user.displayName,
                avatar: getUserAvatar(client.user, { format: 'png' }),
            },
        });

        client.on('messageCreate', async (m) => {
            if (m.channelId === socket.currentChannelId) {
                const raw = getRawMessage(client, m.id);
                const formatted = await formatMessageWithReference(m, raw);
                if (formatted) socket.emit('newMessage', formatted);
            }
        });

        client.on('messageUpdate', async (old, m) => {
            const target = m || old;
            if (target?.channelId === socket.currentChannelId) {
                const raw = getRawMessage(client, target.id);
                const formatted = await formatMessageWithReference(target, raw);
                if (formatted) socket.emit('messageUpdate', formatted);
            }
        });

        client.on('messageDelete', (m) => {
            if (m.channelId === socket.currentChannelId) socket.emit('messageDelete', { id: m.id });
        });

        const handleReactionChange = async (reaction) => {
            if (reaction.message?.channelId === socket.currentChannelId) {
                try {
                    const msg =
                        reaction.message.partial && typeof reaction.message.fetch === 'function'
                            ? await reaction.message.fetch()
                            : reaction.message;
                    const raw = getRawMessage(client, msg.id);
                    const formatted = await formatMessageWithReference(msg, raw);
                    if (formatted) socket.emit('messageUpdate', formatted);
                } catch (e) {}
            }
        };

        client.on('messageReactionAdd', handleReactionChange);
        client.on('messageReactionRemove', handleReactionChange);

        if (client.on) {
            client.on('interactionCreate', async (interaction) => {
                try {
                    if (interaction.type === 5) {
                        socket.emit('modalSubmit', {
                            customId: interaction.customId,
                            components: interaction.fields?.components || [],
                            values: {},
                        });
                    }
                    if (interaction.type === 9) {
                        socket.emit('modalResponse', {
                            title: interaction.data?.title,
                            custom_id: interaction.data?.custom_id,
                            components: interaction.data?.components || [],
                        });
                    }
                } catch (e) {}
            });
        }

        // Guild-wide realtime events for settings pages and sidebars
        const emitForGuild = (guildId, event, payload) => {
            if (guildId && guildId === socket.currentGuildId) socket.emit(event, payload);
        };

        client.on('channelCreate', (channel) => {
            emitForGuild(channel?.guildId, 'channelCreate', {
                id: channel.id,
                name: channel.name,
                type: channel.type,
                parentId: channel.parentId,
                position: channel.rawPosition,
            });
        });

        client.on('channelUpdate', (oldChannel, channel) => {
            emitForGuild(channel?.guildId, 'channelUpdate', {
                id: channel.id,
                name: channel.name,
                type: channel.type,
                parentId: channel.parentId,
                position: channel.rawPosition,
                rateLimitPerUser: channel.rateLimitPerUser,
                nsfw: channel.nsfw,
                topic: channel.topic,
            });
        });

        client.on('channelDelete', (channel) => {
            emitForGuild(channel?.guildId, 'channelDelete', {
                id: channel.id,
                type: channel.type,
                parentId: channel.parentId,
            });
        });

        client.on('threadUpdate', (oldThread, thread) => {
            emitForGuild(thread?.guildId, 'channelUpdate', {
                id: thread.id,
                name: thread.name,
                type: thread.type,
                parentId: thread.parentId,
                archived: thread.archived,
                locked: thread.locked,
            });
        });

        client.on('guildUpdate', (oldGuild, guild) => {
            emitForGuild(guild?.id, 'guildUpdate', {
                id: guild.id,
                name: guild.name,
                icon: guild.iconURL ? guild.iconURL({ format: 'png', size: 128 }) : null,
                banner: guild.bannerURL ? guild.bannerURL({ format: 'png', size: 512 }) : null,
                description: guild.description ?? null,
            });
        });

        client.on('roleCreate', (role) => {
            emitForGuild(role?.guild?.id, 'roleCreate', {
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
            });
        });

        client.on('roleUpdate', (oldRole, role) => {
            emitForGuild(role?.guild?.id, 'roleUpdate', {
                id: role.id,
                name: role.name,
                color: role.hexColor,
                position: role.position,
            });
        });

        client.on('roleDelete', (role) => {
            emitForGuild(role?.guild?.id, 'roleDelete', { id: role.id });
        });

        client.on('guildMemberAdd', (member) => {
            emitForGuild(member?.guild?.id, 'memberAdd', {
                id: member.id,
                username: member.user?.username,
                displayName: member.displayName,
            });
        });

        client.on('guildMemberRemove', (member) => {
            emitForGuild(member?.guild?.id, 'memberRemove', { id: member.id });
        });

        client.on('guildBanAdd', (ban) => {
            emitForGuild(ban?.guild?.id, 'banAdd', { userId: ban.user?.id, reason: ban.reason ?? null });
        });

        client.on('guildBanRemove', (ban) => {
            emitForGuild(ban?.guild?.id, 'banRemove', { userId: ban.user?.id });
        });

        // 絵文字イベントは discord.js v14 (guildEmojisUpdate) と
        // selfbot fork v13 (emojiCreate/Update/Delete) で名前が異なる
        const emitEmojisRefetch = (guildId) => emitForGuild(guildId, 'emojisUpdate', { guildId });
        client.on('guildEmojisUpdate', (oldEmojis, emojis) => {
            emitEmojisRefetch(emojis?.guild?.id || oldEmojis?.guild?.id);
        });
        client.on('emojiCreate', (emoji) => emitEmojisRefetch(emoji?.guild?.id));
        client.on('emojiUpdate', (oldEmoji, emoji) =>
            emitEmojisRefetch(emoji?.guild?.id || oldEmoji?.guild?.id),
        );
        client.on('emojiDelete', (emoji) => emitEmojisRefetch(emoji?.guild?.id));

        client.on('typingStart', (typing) => {
            if (!typing || typing.channelId !== socket.currentChannelId) return;
            if (typing.userId === client.user?.id) return;
            socket.emit('typingStart', {
                channelId: typing.channelId,
                userId: typing.user?.id,
                username: typing.user?.username,
                displayName: typing.user?.globalName ?? typing.user?.displayName ?? typing.user?.username,
                avatar: typing.user?.displayAvatarURL
                    ? typing.user.displayAvatarURL({ format: 'png', size: 64 })
                    : null,
                startedTimestamp: typing.startedTimestamp ?? Date.now(),
            });
        });
    };

    client.on('ready', handleReady);
    client.on('clientReady', handleReady);
};

module.exports = { saveRawMessage, getRawMessage, attachClientEvents };
