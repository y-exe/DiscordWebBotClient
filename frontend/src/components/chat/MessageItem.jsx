import { Fragment } from 'react';
import Symbol from '../common/Symbol';
import MessageContent from './MessageContent';
import MessageComponents from './MessageComponents';
import AttachmentList from './AttachmentList';
import ReactionList from './ReactionList';
import MessageEmbed from './MessageEmbed';
import MessageToolbar from './MessageToolbar';
import MessageReply from './MessageReply';
import { formatDateDivider, SYSTEM_MESSAGE_ICONS, systemMessageText } from './messageUtils';
import { formatTimestamp, getProxyUrl } from '../../utils/helpers';
import { getStickerUrl, isLottieSticker } from '../../utils/stickers';
import { useTwemoji } from '../../hooks/useTwemoji';

const MessageAuthorName = ({ name, color, onClick, onContextMenu }) => {
    const { ref } = useTwemoji();
    return (
        <span ref={ref} className="font-semibold leading-6 cursor-pointer hover:underline" style={{ color }} onClick={onClick} onContextMenu={onContextMenu}>
            {name}
        </span>
    );
};

const EditBox = ({ editInput, setEditInput, setEditingMessageId, onSave }) => (
    <div className="app-edit-box">
        <md-outlined-text-field
            class="app-edit-field m3-text-field"
            type="textarea"
            rows={editInput.split('\n').length || 1}
            value={editInput}
            onInput={(e) => setEditInput(e.currentTarget.value)}
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditingMessageId(null);
                    return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSave(editInput);
                    setEditingMessageId(null);
                }
            }}
            autoFocus
        />
        <div className="app-edit-hint">
            <span>Escでキャンセル</span>
            <span aria-hidden="true">・</span>
            <span>Enterで保存</span>
        </div>
    </div>
);

const MessageItem = ({
    m,
    previousMessage,
    user,
    usersById,
    guildRoles,
    channels,
    guildId,
    channelId,
    socket,
    navigate,
    guilds,
    hovered,
    setHovered,
    canManageMessages,
    editingMessageId,
    setEditingMessageId,
    editInput,
    setEditInput,
    setContextMenu,
    startReply,
    setMediaPicker,
    getPickerAnchor,
    setEmojiGroups,
    setMessages,
    setActiveModal,
    setPreviewData,
    setStickerPreview,
    jumpToMessage,
    resolveReplyMessage,
    openUserPopout,
    openUserContextMenu,
}) => {
    const isMe = m.author.id === user?.id;
    const nameColor = (m.author.color && m.author.color !== '#000000') ? m.author.color : undefined;
    const showDateDivider = !previousMessage
        || new Date(previousMessage.timestamp).toDateString() !== new Date(m.timestamp).toDateString();
    // 7分以内の同一著者メッセージはグループ化(返信・システムメッセージは除外)
    const groupedTail = Boolean(previousMessage
        && previousMessage.author?.id === m.author.id
        && m.timestamp - previousMessage.timestamp < 420000
        && !m.replyTo
        && !m.type
        && !previousMessage.type);
    const sysStyle = m.type ? (SYSTEM_MESSAGE_ICONS[m.type] || null) : null;
    const sysText = m.type ? systemMessageText(m) : null;

    const handleReaction = (emoji, add) => {
        const identifier = emoji.id ? `${emoji.name}:${emoji.id}` : (emoji.name || emoji);
        const emojiKey = emoji.id || (emoji.name || emoji);
        setMessages((prev) => prev.map((msg) => {
            if (msg.id !== m.id) return msg;
            const reactions = [...(msg.reactions || [])];
            const idx = reactions.findIndex((r) => (r.emoji.id || r.emoji.name) === emojiKey);
            if (idx >= 0) {
                const existing = reactions[idx];
                if (add) {
                    reactions[idx] = { ...existing, count: existing.count + 1, me: true };
                } else {
                    if (existing.count <= 1) {
                        reactions.splice(idx, 1);
                    } else {
                        reactions[idx] = { ...existing, count: existing.count - 1, me: false };
                    }
                }
            } else if (add) {
                reactions.push({
                    emoji: emoji.id ? { name: emoji.name, id: emoji.id } : { name: emoji.name || emoji },
                    count: 1,
                    me: true
                });
            }
            return { ...msg, reactions };
        }));
        const eventName = add ? 'addReaction' : 'removeReaction';
        socket.emit(eventName, { channelId, messageId: m.id, emoji: identifier }, (res) => {
            if (res && res.ok === false) {
                setMessages((prev) => prev.map((msg) => {
                    if (msg.id !== m.id) return msg;
                    const reactions = [...(msg.reactions || [])];
                    const idx = reactions.findIndex((r) => (r.emoji.id || r.emoji.name) === emojiKey);
                    if (idx >= 0) {
                        const existing = reactions[idx];
                        if (add) {
                            if (existing.count <= 1) {
                                reactions.splice(idx, 1);
                            } else {
                                reactions[idx] = { ...existing, count: existing.count - 1, me: false };
                            }
                        } else {
                            reactions[idx] = { ...existing, count: existing.count + 1, me: true };
                        }
                    }
                    return { ...msg, reactions };
                }));
            }
        });
    };

    return (
        <Fragment>
            {showDateDivider && (
                <div className="app-message-divider">
                    <time>{formatDateDivider(m.timestamp)}</time>
                </div>
            )}
            {sysText ? (
                <div className="app-system-message">
                    <span className="app-system-icon" data-color={sysStyle?.color || 'primary'}>
                        <Symbol size={16}>{sysStyle?.icon || 'info'}</Symbol>
                    </span>
                    <span className="app-system-text">{sysText}</span>
                </div>
            ) : (
                <article
                    id={`message-${m.id}`}
                    className="app-message"
                    data-continued={groupedTail ? 'true' : 'false'}
                    data-mentioned={(m.mentions?.everyone || m.mentions?.users?.includes(user?.id)) ? 'true' : 'false'}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, message: m }); }}
                    onMouseEnter={() => setHovered(m.id)}
                    onMouseLeave={() => setHovered(null)}
                >
                    {hovered === m.id && (
                        <MessageToolbar
                            message={m}
                            isMe={isMe}
                            canManageMessages={canManageMessages}
                            onReply={startReply}
                            onEdit={(msg) => { setEditingMessageId(msg.id); setEditInput(msg.content); }}
                            onDelete={(msg) => socket.emit('deleteMessage', { channelId, messageId: msg.id })}
                            onOpenMenu={(e) => setContextMenu({ x: e.clientX, y: e.clientY, message: m })}
                            onReactionOpen={(e) => {
                                e?.stopPropagation?.();
                                socket.emit('getAllGuildEmojis', (groups) => setEmojiGroups(Array.isArray(groups) ? groups : []));
                                setMediaPicker({ mode: 'emoji', purpose: 'reaction', messageId: m.id, anchor: getPickerAnchor(e) });
                            }}
                        />
                    )}
                    {m.replyTo && (
                        <MessageReply
                            message={resolveReplyMessage(m)}
                            mention={m.replyTo.mention}
                            onClick={() => jumpToMessage(m.replyTo.id)}
                        />
                    )}
                    <div className="flex min-w-0" style={{ gap: 'var(--app-gap-md)' }}>
                        <div className="flex shrink-0 justify-end" style={{ width: 'var(--app-message-info-width)', padding: groupedTail ? 0 : '2px var(--app-gap-sm)' }}>
                            {groupedTail ? (
                                <span className="app-message-grouped-time">{formatTimestamp(m.timestamp)}</span>
                            ) : (
                                <img
                                    src={getProxyUrl(m.author.avatar)}
                                    loading="lazy"
                                    decoding="async"
                                    className="app-message-author-avatar w-9 h-9 rounded-full object-cover bg-[var(--app-surface-container-highest)]"
                                    onClick={(e) => openUserPopout(e, m.author)}
                                    onContextMenu={(e) => openUserContextMenu(e, m.author, null)}
                                    alt=""
                                />
                            )}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden" style={{ paddingInlineEnd: 'var(--app-gap-lg)' }}>
                            {!groupedTail && (
                                <div className="flex items-baseline gap-1">
                                    <MessageAuthorName
                                        name={m.author.displayName}
                                        color={nameColor}
                                        onClick={(e) => openUserPopout(e, m.author)}
                                        onContextMenu={(e) => openUserContextMenu(e, m.author, null)}
                                    />
                                    <span className="text-sm font-medium text-[var(--app-outline)]">{formatTimestamp(m.timestamp)}</span>
                                </div>
                            )}
                            <div className="min-w-0 flex flex-col gap-1 text-base leading-[1.375rem]">
                                {editingMessageId === m.id ? (
                                    <EditBox
                                        editInput={editInput}
                                        setEditInput={setEditInput}
                                        setEditingMessageId={setEditingMessageId}
                                        onSave={(content) => socket.emit('editMessage', { channelId, messageId: m.id, content })}
                                    />
                                ) : (
                                    <MessageContent content={m.content} channels={channels} guildRoles={guildRoles} usersById={usersById} onUserMentionClick={(event, mentionUserId) => openUserPopout(event, { id: mentionUserId, displayName: usersById?.[mentionUserId]?.name || mentionUserId })} guildId={guildId} navigate={navigate} guilds={guilds} />
                                )}
                            </div>
                            {m.attachments?.length > 0 && (
                                <AttachmentList
                                    attachments={m.attachments}
                                    onImageClick={(url, list, index) => setPreviewData({ isOpen: true, images: (list || []).map((a) => ({ url: a.url, filename: a.filename, size: a.size })), index })}
                                />
                            )}
                            {m.stickers?.length > 0 && (
                                <div className="app-message-stickers">
                                    {m.stickers.map((sticker) => (
                                        <button
                                            type="button"
                                            key={sticker.id}
                                            className="app-message-sticker"
                                            title={sticker.name}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setStickerPreview({ sticker, anchor: e.currentTarget, key: `${sticker.id}-${performance.now()}` });
                                            }}
                                        >
                                            {isLottieSticker(sticker) ? (
                                                <div className="app-sticker-lottie">{sticker.name}</div>
                                            ) : (
                                                <img src={getProxyUrl(getStickerUrl(sticker))} loading="lazy" decoding="async" alt={sticker.name} />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {m.embeds?.map((e, idx) => <MessageEmbed key={idx} embed={e} channels={channels} guildRoles={guildRoles} usersById={usersById} guildId={guildId} navigate={navigate} onImageClick={(url) => setPreviewData({ isOpen: true, images: [{ url }], index: 0 })} />)}
                            <MessageComponents
                                components={m.components}
                                channelId={channelId}
                                messageId={m.id}
                                guildId={guildId}
                                socket={socket}
                                onModal={setActiveModal}
                            />
                            <ReactionList
                                reactions={m.reactions}
                                socket={socket}
                                channelId={channelId}
                                messageId={m.id}
                                onAddReaction={(e) => {
                                    e?.stopPropagation?.();
                                    socket.emit('getAllGuildEmojis', (groups) => setEmojiGroups(Array.isArray(groups) ? groups : []));
                                    setMediaPicker({ mode: 'emoji', purpose: 'reaction', messageId: m.id, anchor: getPickerAnchor(e) });
                                }}
                                onReactionClick={handleReaction}
                            />
                        </div>
                    </div>
                </article>
            )}
        </Fragment>
    );
};

export default MessageItem;
