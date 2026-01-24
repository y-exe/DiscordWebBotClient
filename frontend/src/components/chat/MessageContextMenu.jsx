import Symbol from '../common/Symbol';
import ActionMenu from '../common/ActionMenu';

const MessageContextMenu = ({
    contextMenu,
    user,
    guildId,
    channelId,
    socket,
    setContextMenu,
    startReply,
    canManageMessages,
    setEditingMessageId,
    setEditInput,
    setMediaPicker,
    getPickerAnchor,
    setEmojiGroups,
}) => {
    if (!contextMenu) return null;
    const m = contextMenu.message;
    const isOwnMessage = m.author.id === user?.id;
    const messageReactions = m.reactions || [];
    const messageLink = guildId !== '@me'
        ? `https://discord.com/channels/${guildId}/${m.channelId || channelId}/${m.id}`
        : `https://discord.com/channels/@me/${m.channelId || channelId}/${m.id}`;

    return (
        <ActionMenu
            x={contextMenu.x}
            y={contextMenu.y}
            width={224}
            items={[
                ...(m.attachments?.length ? [
                    { id: 'open-file', label: 'ファイルを開く', icon: <Symbol size={18}>open_in_new</Symbol>, onClick: () => window.open(m.attachments[0].url, '_blank', 'noopener') },
                    { id: 'copy-file-link', label: 'リンクをコピー', icon: <Symbol size={18}>share</Symbol>, onClick: () => navigator.clipboard?.writeText(m.attachments[0].url) },
                    { id: 'save-file', label: 'ファイルを保存', icon: <Symbol size={18}>download</Symbol>, onClick: () => {
                        const link = document.createElement('a');
                        link.href = m.attachments[0].url;
                        link.download = m.attachments[0].name || 'file';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                    } },
                    { type: 'divider' },
                ] : []),
                { id: 'reply', label: '返信', icon: <Symbol size={18}>reply</Symbol>, onClick: () => startReply(m) },
                { id: 'copy-text', label: 'テキストをコピー', icon: <Symbol size={18}>content_copy</Symbol>, onClick: () => navigator.clipboard?.writeText(m.content || '') },
                { type: 'divider' },
                { id: 'react', label: 'リアクションを付ける', icon: <Symbol size={18}>emoji_emotions</Symbol>, onClick: (e) => {
                    e?.stopPropagation?.();
                    socket.emit('getAllGuildEmojis', (groups) => setEmojiGroups(Array.isArray(groups) ? groups : []));
                    setMediaPicker({ mode: 'emoji', purpose: 'reaction', messageId: m.id, anchor: getPickerAnchor(e) });
                } },
                ...(isOwnMessage ? [
                    { id: 'edit', label: 'メッセージを編集', icon: <Symbol size={18}>edit</Symbol>, onClick: () => { setEditingMessageId(m.id); setEditInput(m.content); } },
                ] : []),
                { id: 'pin', label: m.pinned ? 'ピン留めを解除' : 'ピン留め', icon: <Symbol size={18}>pin_invoke</Symbol>, onClick: () => socket.emit(m.pinned ? 'unpinMessage' : 'pinMessage', { channelId: m.channelId || channelId, messageId: m.id }) },
                ...(messageReactions.length > 0 ? [
                    ...(canManageMessages ? [
                        {
                            id: 'remove-reactions',
                            label: 'リアクションを削除',
                            icon: <Symbol size={18}>delete_sweep</Symbol>,
                            items: messageReactions.map((r) => {
                                const identifier = r.emoji.id ? `${r.emoji.name}:${r.emoji.id}` : r.emoji.name;
                                return {
                                    id: `remove-reaction-${identifier}`,
                                    label: identifier,
                                    onClick: () => socket.timeout(15000).emit('removeReactionEmoji', { channelId: m.channelId || channelId, messageId: m.id, emoji: identifier }),
                                };
                            }),
                        },
                        { id: 'clear-reactions', label: 'すべてのリアクションを削除', icon: <Symbol size={18}>clear_all</Symbol>, onClick: () => socket.timeout(15000).emit('clearReactions', { channelId: m.channelId || channelId, messageId: m.id }) },
                    ] : []),
                ] : []),
                ...(isOwnMessage || canManageMessages ? [
                    { id: 'delete', label: 'メッセージを削除', icon: <Symbol size={18}>delete</Symbol>, danger: true, onClick: () => socket.emit('deleteMessage', { channelId: m.channelId || channelId, messageId: m.id }) },
                ] : []),
                { type: 'divider' },
                { id: 'copy-link', label: 'メッセージリンクをコピー', icon: <Symbol size={18}>share</Symbol>, onClick: () => navigator.clipboard?.writeText(messageLink) },
                { id: 'copy-id', label: 'メッセージIDをコピー', icon: <Symbol size={18}>badge</Symbol>, onClick: () => navigator.clipboard?.writeText(m.id) },
            ]}
            onClose={() => setContextMenu(null)}
        />
    );
};

export default MessageContextMenu;
