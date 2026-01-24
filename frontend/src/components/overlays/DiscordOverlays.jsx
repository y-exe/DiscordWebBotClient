import ChannelModal from '../modals/ChannelModal';
import ServerModal, { JoinServerModal } from '../modals/ServerModal';
import GroupModal from '../modals/GroupModal';
import AddFriendModal from '../modals/AddFriendModal';
import AddGroupMemberModal from '../modals/AddGroupMemberModal';
import InviteModal from '../modals/InviteModal';
import ActionMenu from '../common/ActionMenu';
import ConfirmDialog from '../common/ConfirmDialog';
import ModalDialog from '../chat/ModalDialog';
import StickerPreviewMenu from '../chat/StickerPreviewMenu';
import ImageViewer from '../chat/ImageViewer';
import MediaPicker from '../chat/MediaPicker';
import UserPopout from '../overlay/UserPopout';

const DiscordOverlays = ({
    socket,
    navigate,
    guildId: paramGuildId,
    currentGuildData,
    channelId: paramChannelId,
    channels,
    channelDeleteTarget,
    friends,
    channelModal,
    channelModalBusy,
    channelModalError,
    serverModalOpen,
    serverModalBusy,
    serverModalError,
    joinModalOpen,
    joinModalBusy,
    joinModalError,
    groupModalOpen,
    groupModalBusy,
    groupModalError,
    addFriendModalOpen,
    addFriendModalBusy,
    addFriendModalError,
    addFriendModalSuccess,
    groupMemberTarget,
    groupMemberBusy,
    groupMemberError,
    inviteModal,
    inviteBusy,
    invite,
    inviteError,
    requestCreateInvite,
    actionMenu,
    activeModal,
    stickerPreview,
    stickerPreviewGuild,
    previewData,
    userPopout,
    mediaPicker,
    pickerStyle,
    guildEmojis,
    emojiGroups,
    guildStickers,
    replyingTo,
    setChannelModal,
    setChannelModalBusy,
    setChannelModalError,
    setChannels,
    setGuilds,
    setChannelDeleteTarget,
    setServerModalOpen,
    setServerModalBusy,
    setServerModalError,
    setJoinModalOpen,
    setJoinModalBusy,
    setJoinModalError,
    setGroupModalOpen,
    setGroupModalBusy,
    setGroupModalError,
    setAddFriendModalOpen,
    setAddFriendModalBusy,
    setAddFriendModalError,
    setAddFriendModalSuccess,
    setGroupMemberTarget,
    setGroupMemberBusy,
    setGroupMemberError,
    setInviteModal,
    setInvite,
    setInviteError,
    setActionMenu,
    setActiveModal,
    setStickerPreview,
    setPreviewData,
    setUserPopout,
    setMediaPicker,
    setReplyingTo,
    setFriends,
}) => (
    <>
            {channelModal && (
                <ChannelModal
                    open
                    key={`${channelModal.mode}-${channelModal.channel?.id || channelModal.defaultParentId || channelModal.type || 'new'}`}
                    mode={channelModal.mode}
                    channel={channelModal.channel}
                    initialType={channelModal.type === 'category' ? 'category' : null}
                    defaultParentId={channelModal.defaultParentId}
                    categories={channels.filter((cat) => cat.id !== 'uncategorized' && cat.id !== 'dms' && cat.name).map((cat) => ({ id: cat.id, name: cat.name }))}
                    busy={channelModalBusy}
                    error={channelModalError}
                    onClose={() => { setChannelModal(null); setChannelModalError(null); }}
                    onSubmit={(payload) => {
                        setChannelModalBusy(true);
                        setChannelModalError(null);
                        if (channelModal.mode === 'edit') {
                            socket.timeout(15000).emit('updateChannel', { channelId: channelModal.channel.id, ...payload }, (err, result) => {
                                setChannelModalBusy(false);
                                if (err || !result?.ok) {
                                    setChannelModalError(result?.error || '保存できませんでした');
                                    return;
                                }
                                setChannelModal(null);
                                socket.emit('getChannels', paramGuildId, (data) => setChannels(Array.isArray(data) ? data : []));
                            });
                        } else {
                            socket.timeout(15000).emit('createChannel', {
                                guildId: paramGuildId,
                                name: payload.name,
                                type: channelModal.type === 'category' ? 'category' : payload.type,
                                parentId: channelModal.type === 'category' ? null : payload.parentId,
                                nsfw: payload.nsfw,
                            }, (err, result) => {
                                setChannelModalBusy(false);
                                if (err || !result?.ok) {
                                    setChannelModalError(result?.error || 'チャンネルを作成できませんでした');
                                    return;
                                }
                                setChannelModal(null);
                                socket.emit('getChannels', paramGuildId, (data) => {
                                    const next = Array.isArray(data) ? data : [];
                                    setChannels(next);
                                    if (result.channel?.id) navigate(`/${paramGuildId}/${result.channel.id}`);
                                });
                            });
                        }
                    }}
                />
            )}
            {channelDeleteTarget && (
                <ConfirmDialog
                    open
                    title={`「${channelDeleteTarget.name || 'このチャンネル'}」を削除しますか?`}
                    body={(channelDeleteTarget.type === 4 || channelDeleteTarget.type === 'GUILD_CATEGORY')
                        ? 'カテゴリを削除すると、中のチャンネルはカテゴリなしになります。'
                        : 'チャンネルとすべてのメッセージが完全に削除されます。この操作は取り消せません。'}
                    confirmLabel="削除"
                    busy={channelModalBusy}
                    onClose={() => setChannelDeleteTarget(null)}
                    onConfirm={() => {
                        setChannelModalBusy(true);
                        socket.timeout(15000).emit('deleteChannel', { channelId: channelDeleteTarget.id }, (err, result) => {
                            setChannelModalBusy(false);
                            setChannelDeleteTarget(null);
                            if (err || !result?.ok) return;
                            if (paramChannelId === channelDeleteTarget.id) navigate(`/${paramGuildId}`);
                            socket.emit('getChannels', paramGuildId, (data) => setChannels(Array.isArray(data) ? data : []));
                        });
                    }}
                />
            )}
            {serverModalOpen && (
                <ServerModal
                    open
                    busy={serverModalBusy}
                    error={serverModalError}
                    onClose={() => { setServerModalOpen(false); setServerModalError(null); }}
                    onSubmit={({ name, icon }) => {
                        setServerModalBusy(true);
                        setServerModalError(null);
                        socket.timeout(20000).emit('createGuild', { name, icon }, (err, result) => {
                            setServerModalBusy(false);
                            if (err || !result?.ok) {
                                setServerModalError(result?.error || 'サーバーを作成できませんでした');
                                return;
                            }
                            setServerModalOpen(false);
                            socket.emit('getGuilds', setGuilds);
                            if (result.guild?.id) navigate(`/${result.guild.id}`);
                        });
                    }}
                />
            )}
            {joinModalOpen && (
                <JoinServerModal
                    open
                    busy={joinModalBusy}
                    error={joinModalError}
                    onClose={() => { setJoinModalOpen(false); setJoinModalError(null); }}
                    onSubmit={(code) => {
                        setJoinModalBusy(true);
                        setJoinModalError(null);
                        socket.timeout(20000).emit('joinGuild', { code }, (err, result) => {
                            setJoinModalBusy(false);
                            if (err || !result?.ok) {
                                setJoinModalError(result?.error || 'サーバーに参加できませんでした');
                                return;
                            }
                            setJoinModalOpen(false);
                            socket.emit('getGuilds', setGuilds);
                            if (result.guild?.id) navigate(`/${result.guild.id}`);
                        });
                    }}
                />
            )}
            {groupModalOpen && (
                <GroupModal
                    open
                    busy={groupModalBusy}
                    error={groupModalError}
                    friends={friends}
                    onClose={() => { setGroupModalOpen(false); setGroupModalError(null); }}
                    onSubmit={({ name, userIds }) => {
                        setGroupModalBusy(true);
                        setGroupModalError(null);
                        socket.timeout(20000).emit('createGroupDM', { userIds, name: name || null }, (err, result) => {
                            setGroupModalBusy(false);
                            if (err || !result?.ok) {
                                setGroupModalError(result?.error || 'グループDMを作成できませんでした');
                                return;
                            }
                            setGroupModalOpen(false);
                            if (result.channel?.id) navigate(`/@me/${result.channel.id}`);
                        });
                    }}
                />
            )}
            {addFriendModalOpen && (
                <AddFriendModal
                    open
                    busy={addFriendModalBusy}
                    error={addFriendModalError}
                    success={addFriendModalSuccess}
                    onClose={() => { setAddFriendModalOpen(false); setAddFriendModalError(null); setAddFriendModalSuccess(null); }}
                    onSubmit={({ username }) => {
                        setAddFriendModalBusy(true);
                        setAddFriendModalError(null);
                        setAddFriendModalSuccess(null);
                        socket.timeout(15000).emit('sendFriendRequest', { username }, (err, result) => {
                            setAddFriendModalBusy(false);
                            if (err || !result?.ok) {
                                setAddFriendModalError(result?.error || 'フレンド申請を送信できませんでした');
                                return;
                            }
                            setAddFriendModalSuccess(`「${username}」にフレンド申請を送信しました`);
                            socket.emit('getFriends', (data) => setFriends(Array.isArray(data) ? data : []));
                        });
                    }}
                />
            )}
            {groupMemberTarget && (
                <AddGroupMemberModal
                    open
                    busy={groupMemberBusy}
                    error={groupMemberError}
                    friends={friends}
                    existingIds={(groupMemberTarget.channel?.recipients || []).map((r) => r.id)}
                    onClose={() => { setGroupMemberTarget(null); setGroupMemberError(null); }}
                    onSubmit={({ userIds }) => {
                        setGroupMemberBusy(true);
                        setGroupMemberError(null);
                        const addNext = async (ids) => {
                            for (const id of ids) {
                                const result = await new Promise((resolve) => {
                                    socket.timeout(20000).emit('addGroupRecipient', { channelId: groupMemberTarget.channel.id, userId: id }, (err, res) => resolve(res));
                                });
                                if (!result?.ok) {
                                    setGroupMemberError(result?.error || 'メンバーを追加できませんでした');
                                    return false;
                                }
                            }
                            return true;
                        };
                        addNext(userIds).then((done) => {
                            setGroupMemberBusy(false);
                            if (!done) return;
                            setGroupMemberTarget(null);
                            if (paramGuildId === '@me') {
                                socket.emit('getChannels', '@me', (data) => {
                                    if (Array.isArray(data)) setChannels(data);
                                });
                            }
                        });
                    }}
                />
            )}
            {inviteModal && (
                <InviteModal
                    open
                    channelName={inviteModal.channelName}
                    busy={inviteBusy}
                    invite={invite}
                    error={inviteError}
                    onClose={() => { setInviteModal(null); setInvite(null); setInviteError(null); }}
                    onCreate={requestCreateInvite}
                />
            )}
            {actionMenu && (
                <ActionMenu
                    x={actionMenu.x}
                    y={actionMenu.y}
                    items={actionMenu.items}
                    onClose={() => setActionMenu(null)}
                />
            )}
            {activeModal && (
                <ModalDialog
                    modal={activeModal}
                    onClose={() => setActiveModal(null)}
                    onSubmit={(customId, values) => {
                        socket?.emit('interaction', {
                            type: 'modal',
                            customId,
                            values,
                            channelId: paramChannelId,
                            guildId: paramGuildId,
                        });
                        setActiveModal(null);
                    }}
                />
            )}
            <StickerPreviewMenu
                key={stickerPreview?.key || 'sticker-preview'}
                preview={stickerPreview}
                guild={stickerPreviewGuild}
                onClose={(key) => setStickerPreview((current) => (!key || current?.key === key ? null : current))}
            />
            {previewData.isOpen && <ImageViewer images={previewData.images} initialIndex={previewData.index} onClose={() => setPreviewData({ ...previewData, isOpen: false })} />}
            {userPopout && <UserPopout userId={userPopout.userId} guildId={paramGuildId} anchor={userPopout.anchor} socket={socket} fallbackUser={userPopout.fallbackUser} onClose={() => setUserPopout(null)} />}
            {mediaPicker && (
                <div className="app-floating-picker" style={pickerStyle}>
                    <MediaPicker
                        mode={mediaPicker.mode}
                        currentGuild={currentGuildData}
                        guildEmojis={guildEmojis}
                        emojiGroups={emojiGroups}
                        guildStickers={guildStickers}
                        onClose={() => setMediaPicker(null)}
                        onEmoji={(emoji) => {
                            if (mediaPicker.purpose === 'reaction') {
                                const identifier = emoji.id ? `${emoji.name}:${emoji.id}` : emoji;
                                socket.emit('addReaction', { channelId: paramChannelId, messageId: mediaPicker.messageId, emoji: identifier });
                                return;
                            }
                            const value = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji;
                            window.dispatchEvent(new CustomEvent('insert-emoji', { detail: value }));
                        }}
                        onSticker={(sticker) => {
                            socket.timeout(45000).emit('sendMessage', {
                                channelId: paramChannelId,
                                content: '',
                                files: [],
                                stickers: [sticker.id],
                                reply: replyingTo ? { messageId: replyingTo.id, mention: replyingTo.mention } : null
                            }, () => {
                                setReplyingTo(null);
                            });
                        }}
                    />
                </div>
            )}
    </>
);

export default DiscordOverlays;
