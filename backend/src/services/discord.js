const { snowflakeToTimestamp } = require('../utils/helpers');
const { getDirectDisplayName, getUserAvatar } = require('./formatter');

const getDMChannels = async (client) => {
    const dms = client.channels.cache.filter(c => c.type === 'DM' || c.type === 'GROUP_DM' || c.type === 1 || c.type === 3);
    return Array.from(dms.values()).map(c => {
        const recipient = c.type === 'DM' || c.type === 1 ? c.recipient : null;
        return {
            id: c.id,
            name: c.type === 'GROUP_DM' || c.type === 3 ? (c.name || "グループDM") : getDirectDisplayName(recipient),
            avatar: getUserAvatar(recipient, { format: 'png' }),
            type: c.type,
            lastMessageId: c.lastMessageId,
            lastMessageTimestamp: c.lastMessageId ? snowflakeToTimestamp(c.lastMessageId) : 0
        };
    }).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp);
};

const getRelationshipEntries = (client) => {
    const cache = client.relationships?.cache;
    if (cache && typeof cache.entries === 'function') {
        return Array.from(cache.entries()).map(([id, type]) => ({
            id,
            type,
            nickname: client.relationships?.friendNicknames?.get?.(id) || null
        }));
    }
    return [];
};

const getFriends = async (client) => {
    let relationships = [];
    try {
        const apiRelationships = await client.api.users['@me'].relationships.get();
        if (Array.isArray(apiRelationships)) {
            relationships = apiRelationships;
            client.relationships?._setup?.(apiRelationships);
        }
    } catch (e) { }

    if (!relationships.length) relationships = getRelationshipEntries(client);

    const friendEntries = relationships.filter((entry) => {
        const type = entry.type ?? entry.relationshipType;
        return [1, 3, 4].includes(type) || ['FRIEND', 'friend', 'PENDING_INCOMING', 'PENDING_OUTGOING'].includes(type);
    });

    const uniqueFriendEntries = [];
    const seenUserIds = new Set();
    for (const entry of friendEntries) {
        const userId = entry.user?.id || entry.userId || entry.userID || entry.id;
        if (userId && !seenUserIds.has(userId)) {
            seenUserIds.add(userId);
            uniqueFriendEntries.push({ entry, userId });
        }
    }

    const users = await Promise.all(uniqueFriendEntries.map(async ({ entry, userId }) => {
        const type = entry.type ?? entry.relationshipType;
        let user = entry.user || client.users.cache.get(userId);
        if (!user) {
            try {
                user = await Promise.race([
                    client.users.fetch(userId),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
                ]);
            } catch (e) { }
        }
        return {
            user: user || { id: userId, username: entry.nickname || "Unknown User" },
            relationshipType: [3, 4].includes(type) || String(type).includes('PENDING') ? 'pending' : 'friend'
        };
    }));

    return users.map(({ user, relationshipType }) => {
        const presence = user.presence || client.presence?.cache?.get?.(user.id) || client.presences?.cache?.get?.(user.id);
        const activity = presence?.activities?.find?.((item) => item.state || item.name);
        return {
            id: user.id,
            username: user.username,
            displayName: getDirectDisplayName(user),
            globalName: user.globalName || user.global_name || user.displayName,
            avatar: getUserAvatar(user, { dynamic: true, format: 'png' }),
            status: presence?.status || user.presence?.status || 'offline',
            activity: activity?.state || activity?.name || '',
            activityType: activity?.type || '',
            relationshipType
        };
    }).sort((a, b) => {
        const aOffline = ['offline', 'invisible'].includes(a.status) ? 1 : 0;
        const bOffline = ['offline', 'invisible'].includes(b.status) ? 1 : 0;
        if (aOffline !== bOffline) return aOffline - bOffline;
        return a.displayName.localeCompare(b.displayName, 'ja');
    });
};

const getChannelsWithMembers = (guild) => {
    if (!guild) return [];
    const cache = guild.channels.cache;
    const allCategories = cache.filter(c => c.type === 'GUILD_CATEGORY' || c.type === 4).sort((a, b) => a.rawPosition - b.rawPosition);
    const allThreads = cache.filter(c => c.isThread?.() || [10, 11, 12].includes(c.type));

    const mainChannels = cache.filter(c => !c.isThread?.() && c.type !== 'GUILD_CATEGORY' && c.type !== 4 && c.viewable)
        .sort((a, b) => {
            const isVoiceA = (a.type === 'GUILD_VOICE' || a.type === 'GUILD_STAGE_VOICE' || a.type === 2 || a.type === 13);
            const isVoiceB = (b.type === 'GUILD_VOICE' || b.type === 'GUILD_STAGE_VOICE' || b.type === 2 || b.type === 13);
            if (isVoiceA !== isVoiceB) return isVoiceA ? 1 : -1;
            return a.rawPosition - b.rawPosition;
        });

    const mapChannel = (c) => ({
        id: c.id, name: c.name, type: c.type,
        members: (c.type === 'GUILD_VOICE' || c.type === 'GUILD_STAGE_VOICE' || c.type === 2 || c.type === 13) ? c.members.map(m => ({
            id: m.id, username: m.displayName, avatar: m.user.displayAvatarURL({ format: 'png' })
        })) : [],
        threads: allThreads.filter(t => t.parentId === c.id).map(t => ({
            id: t.id, name: t.name, type: t.type, parentId: t.parentId,
            lastMessageTimestamp: t.lastMessageId ? snowflakeToTimestamp(t.lastMessageId) : t.createdTimestamp,
            messageCount: t.messageCount || 0
        })).sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
    });

    const result = [];
    const uncategorized = { id: "uncategorized", name: null, channels: mainChannels.filter(c => !c.parentId).map(mapChannel) };
    if (uncategorized.channels.length > 0) result.push(uncategorized);
    allCategories.forEach(cat => {
        const catChannels = mainChannels.filter(c => c.parentId === cat.id).map(mapChannel);
        result.push({ id: cat.id, name: cat.name, channels: catChannels });
    });
    return result;
};

module.exports = {
    getDMChannels,
    getRelationshipEntries,
    getFriends,
    getChannelsWithMembers
};
