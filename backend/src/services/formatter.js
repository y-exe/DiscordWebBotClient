const { snowflakeToTimestamp } = require('../utils/helpers');

const getUserDisplayName = (user, member) => {
    if (member?.nickname) return member.nickname;
    if (user?.globalName) return user.globalName;
    if (user?.displayName) return user.displayName;
    if (user?.global_name) return user.global_name;
    return user?.username || 'Unknown User';
};

const getDirectDisplayName = (user) => {
    if (!user) return 'Unknown User';
    return user.globalName || user.global_name || user.displayName || user.username || 'Unknown User';
};

const getUserAvatar = (user, options = {}) => {
    if (!user) return null;
    const format = options.format || 'png';
    const size = options.size ? `?size=${options.size}` : '';
    if (typeof user.displayAvatarURL === 'function') {
        return user.displayAvatarURL({ dynamic: options.dynamic !== false, format, size: options.size || 512 });
    }
    if (typeof user.avatarURL === 'function') {
        const url = user.avatarURL({ dynamic: options.dynamic !== false, format, size: options.size || 512 });
        if (url) return url;
    }
    if (user.avatar) {
        const isAnimated = String(user.avatar).startsWith('a_');
        const ext = (options.dynamic !== false && isAnimated) ? 'gif' : format;
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}${size}`;
    }
    const defaultIndex = (BigInt(user.id || 0) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
};

const getStickerFormat = (sticker) => {
    const format = sticker?.format_type ?? sticker?.formatType ?? sticker?.format;
    if (format === 1 || format === 'PNG') return 'PNG';
    if (format === 2 || format === 'APNG') return 'APNG';
    if (format === 3 || format === 'LOTTIE') return 'LOTTIE';
    if (format === 4 || format === 'GIF') return 'GIF';
    return format || 'PNG';
};

const getStickerUrl = (sticker) => {
    if (!sticker?.id) return sticker?.url || null;
    const format = getStickerFormat(sticker);
    if (format === 'GIF') return `https://media.discordapp.net/stickers/${sticker.id}.gif`;
    if (format === 'LOTTIE') return `https://media.discordapp.net/stickers/${sticker.id}.json`;
    return sticker.url || `https://media.discordapp.net/stickers/${sticker.id}.png`;
};

const formatSticker = (sticker) => {
    if (!sticker) return null;
    const format = getStickerFormat(sticker);
    return {
        id: sticker.id,
        name: sticker.name || 'Sticker',
        description: sticker.description || '',
        format,
        url: getStickerUrl(sticker),
        guildId: sticker.guildId || sticker.guild_id || sticker.guild?.id || null,
        packId: sticker.packId || sticker.pack_id || null,
        tags: Array.isArray(sticker.tags) ? sticker.tags : String(sticker.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean)
    };
};

const formatComponent = (comp) => {
    if (!comp) return null;
    const base = { type: comp.type, custom_id: comp.custom_id || comp.customId, disabled: comp.disabled || false };
    switch (comp.type) {
        case 1:
            return { ...base, components: (comp.components || []).map(formatComponent).filter(Boolean) };
        case 2:
            return { ...base, style: comp.style, label: comp.label, emoji: comp.emoji, url: comp.url };
        case 3:
            return { ...base, placeholder: comp.placeholder, min_values: comp.min_values || comp.minValues, max_values: comp.max_values || comp.maxValues, options: (comp.options || []).map(o => ({ label: o.label, value: o.value, description: o.description, emoji: o.emoji, default: o.default })) };
        case 5:
        case 6:
        case 7:
        case 8:
            return { ...base, placeholder: comp.placeholder, min_values: comp.min_values || comp.minValues, max_values: comp.max_values || comp.maxValues };
        default:
            return null;
    }
};

const formatComponents = (components) => {
    if (!components || !components.length) return [];
    return components.map(formatComponent).filter(Boolean);
};

const formatRawMessage = (raw) => {
    if (!raw || !raw.author) return null;
    const author = raw.author;
    const displayName = author.global_name || author.username;
    const avatar = author.avatar
        ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(author.id || 0) >> 22n) % 6n}.png`;

    return {
        id: raw.id,
        content: raw.content || '',
        timestamp: raw.timestamp ? new Date(raw.timestamp).getTime() : snowflakeToTimestamp(raw.id),
        author: {
            id: author.id,
            username: author.username,
            displayName,
            globalName: author.global_name || author.username,
            avatar,
            color: null
        },
        attachments: (raw.attachments || []).map(a => ({ url: a.url })),
        stickers: (raw.sticker_items || raw.stickers || []).map(formatSticker).filter(Boolean),
        embeds: raw.embeds || [],
        components: (raw.components || []).length ? formatComponents(raw.components) : [],
        reactions: (raw.reactions || []).map(r => ({
            emoji: { name: r.emoji?.name, id: r.emoji?.id, url: r.emoji?.id ? `https://cdn.discordapp.com/emojis/${r.emoji.id}.png` : null },
            count: r.count,
            me: r.me || false
        })),
        channelId: raw.channel_id,
        replyTo: raw.referenced_message ? { id: raw.referenced_message.id, message: formatRawMessage(raw.referenced_message) } : null
    };
};

const formatMessage = (m, referencedMessage = null, rawMessage = null, preformattedReferenced = null) => {
    if (!m || !m.author) return null;
    const referenced = preformattedReferenced || (referencedMessage ? formatMessage(referencedMessage) : null);
    const displayName = m.guild ? getUserDisplayName(m.author, m.member) : getDirectDisplayName(m.author);

    let components = [];
    const rawComponents = rawMessage?.components || m.components;
    if (rawComponents && rawComponents.length > 0) {
        components = formatComponents(rawComponents);
    }

    return {
        id: m.id, content: m.content, timestamp: m.createdTimestamp,
        author: {
            id: m.author.id, username: m.author.username,
            displayName,
            globalName: m.author.globalName || m.author.displayName,
            avatar: getUserAvatar(m.author, { format: 'png' }),
            color: m.member ? m.member.displayHexColor : null,
        },
        attachments: m.attachments.map(a => ({ url: a.url })),
        stickers: m.stickers ? m.stickers.map(formatSticker).filter(Boolean) : [],
        embeds: m.embeds,
        components,
        reactions: m.reactions.cache.filter(r => r.count > 0).map(r => ({
            emoji: { name: r.emoji.name, id: r.emoji.id, url: r.emoji.id ? `https://cdn.discordapp.com/emojis/${r.emoji.id}.png` : null },
            count: r.count, me: r.me
        })),
        channelId: m.channel.id,
        replyTo: m.reference?.messageId ? { id: m.reference.messageId, message: referenced } : null
    };
};

const formatMessageWithReference = async (m, rawMessage = null) => {
    if (!m) return null;
    const refId = m.reference?.messageId;
    if (!refId) return formatMessage(m, null, rawMessage);

    if (rawMessage?.referenced_message) {
        const preformatted = formatRawMessage(rawMessage.referenced_message);
        return formatMessage(m, null, rawMessage, preformatted);
    }

    const cached = m.channel?.messages?.cache?.get(refId);
    if (cached) {
        return formatMessage(m, cached, rawMessage);
    }

    let referencedMessage = null;
    if (typeof m.fetchReference === 'function') {
        try {
            referencedMessage = await Promise.race([
                m.fetchReference(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
            ]);
        } catch (e) { }
    }
    return formatMessage(m, referencedMessage, rawMessage);
};

module.exports = {
    getUserDisplayName,
    getDirectDisplayName,
    getUserAvatar,
    getStickerFormat,
    getStickerUrl,
    formatSticker,
    formatComponent,
    formatComponents,
    formatRawMessage,
    formatMessage,
    formatMessageWithReference
};
