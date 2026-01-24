import { useCallback, useEffect, useState } from 'react';
import { FaBan, FaLink, FaTrash } from 'react-icons/fa6';
import { getProxyUrl } from '../../../utils/helpers';
import {
    ActionButton,
    EmptyState,
    LoadingSpinner,
    PERMISSION_BITS,
    SectionLabel,
    SelectField,
    SwitchRow,
    TextField,
    can,
} from '../ui';

const formatDate = (timestamp) => {
    if (!timestamp) return '?';
    try {
        return new Date(timestamp).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return '?';
    }
};

export const GuildInvitesPage = ({ socket, guildId, guild }) => {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        if (!socket || !guildId) return;
        socket.timeout(15000).emit('getGuildInvites', { guildId }, (err, result) => {
            setLoading(false);
            if (err || !result?.ok) {
                setError(result?.error || '招待を取得できませんでした');
                return;
            }
            setInvites(result.invites || []);
        });
    }, [socket, guildId]);

    useEffect(() => { load(); }, [load]);

    const channels = guild?.channels || [];
    const [targetChannel, setTargetChannel] = useState('');

    return (
        <div className="settings-page">
            <SectionLabel>招待</SectionLabel>
            <p className="settings-card-description">サーバーへの招待リンクを管理します。</p>
            <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <SelectField
                            label="チャンネル"
                            value={targetChannel}
                            options={[[ '', 'チャンネルを選択...' ], ...channels.map((ch) => [ch.id, `#${ch.name}`])]}
                            onChange={setTargetChannel}
                        />
                    </div>
                    <div className="pb-0.5">
                        <ActionButton
                            variant="tonal"
                            disabled={!targetChannel}
                            onClick={() => {
                                socket.timeout(15000).emit('createInvite', { channelId: targetChannel, maxAge: 86400, maxUses: 0 }, (err, result) => {
                                    if (err || !result?.ok) {
                                        setError(result?.error || '招待を作成できませんでした');
                                        return;
                                    }
                                    setError(null);
                                    load();
                                });
                            }}
                        >
                            <FaLink size={13} className="mr-1 inline" /> 招待を作成
                        </ActionButton>
                    </div>
                </div>
            {error && <p className="app-modal-error">{error}</p>}
            {loading ? <LoadingSpinner /> : invites.length === 0 ? (
                <EmptyState title="招待リンクはありません" />
            ) : (
                <div className="settings-list">
                    {invites.map((invite) => (
                        <div key={invite.code} className="settings-list-row">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-mono text-sm">discord.gg/{invite.code}</span>
                                <span className="block text-xs text-[var(--app-outline)]">
                                    #{invite.channel?.name || '不明'} ・ {invite.uses}/{invite.maxUses || '∞'} 使用
                                    {invite.inviter ? ` ・ ${invite.inviter.username}` : ''}
                                    {invite.expiresAt ? ` ・ 有効期限 ${formatDate(invite.expiresAt)}` : ' ・ 無期限'}
                                </span>
                            </span>
                            <button
                                type="button"
                                className="settings-icon-btn"
                                title="コピー"
                                onClick={() => navigator.clipboard?.writeText(invite.url)}
                            >
                                <FaLink size={13} />
                            </button>
                            <button
                                type="button"
                                className="settings-icon-btn settings-icon-danger"
                                title="取り消し"
                                onClick={() => {
                                    socket.timeout(15000).emit('deleteInvite', { code: invite.code }, (err, result) => {
                                        if (!err && result?.ok) load();
                                        else setError(result?.error || '取り消せませんでした');
                                    });
                                }}
                            >
                                <FaTrash size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * サーバー設定: BAN
 */
export const GuildBansPage = ({ socket, guildId, myPermissions }) => {
    const [bans, setBans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        if (!socket || !guildId) return;
        socket.timeout(15000).emit('getGuildBans', { guildId }, (err, result) => {
            setLoading(false);
            if (err || !result?.ok) {
                setError(result?.error || 'BANリストを取得できませんでした');
                return;
            }
            setBans(result.bans || []);
        });
    }, [socket, guildId]);

    useEffect(() => { load(); }, [load]);

    if (!can(myPermissions, PERMISSION_BITS.BAN_MEMBERS)) {
        return <EmptyState title="BANを管理する権限がありません" />;
    }

    return (
        <div className="settings-page">
            <SectionLabel>BANされたユーザー ({bans.length})</SectionLabel>
            {error && <p className="app-modal-error">{error}</p>}
            {loading ? <LoadingSpinner /> : bans.length === 0 ? (
                <EmptyState title="BANされたユーザーはいません" />
            ) : (
                <div className="settings-list">
                    {bans.map((ban) => (
                        <div key={ban.user?.id} className="settings-list-row">
                            {ban.user?.avatar
                                ? <img src={getProxyUrl(ban.user.avatar)} alt="" className="h-8 w-8 rounded-full object-cover" />
                                : <span className="settings-list-icon"><FaBan size={13} /></span>}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate">{ban.user?.tag || ban.user?.username || '不明'}</span>
                                {ban.reason && <span className="block text-xs text-[var(--app-outline)]">理由: {ban.reason}</span>}
                            </span>
                            <button
                                type="button"
                                className="settings-btn settings-btn-outlined"
                                onClick={() => {
                                    socket.timeout(15000).emit('unbanMember', { guildId, userId: ban.user.id }, (err, result) => {
                                        if (!err && result?.ok) load();
                                        else setError(result?.error || 'BANを解除できませんでした');
                                    });
                                }}
                            >
                                BAN解除
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * サーバー設定: 絵文字
 */
export const GuildEmojisPage = ({ socket, guildId, emojis, myPermissions, onChanged }) => {
    const canManage = can(myPermissions, PERMISSION_BITS.MANAGE_EXPRESSIONS);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [image, setImage] = useState(null);
    const [fileKey, setFileKey] = useState(0);

    const handleFile = (event) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) { event.target.value = ''; return; }
        if (file.size > 256 * 1024) {
            setError('絵文字は256KB未満にしてください');
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setImage(reader.result);
        reader.readAsDataURL(file);
    };

    if (!canManage) {
        return <EmptyState icon="😀" title="絵文字を管理する権限がありません" />;
    }

    return (
        <div className="settings-page">
            <SectionLabel>絵文字をアップロード</SectionLabel>
            <p className="settings-card-description">名前は2文字以上の英数字とアンダースコア、ハイフンで入力します。</p>
            <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                        <TextField label="絵文字の名前" value={name} maxLength={32} placeholder="hyper_dino" onChange={setName} />
                    </div>
                    <label className="settings-btn settings-btn-outlined cursor-pointer">
                        {image ? '画像を選択済み' : '画像を選択'}
                        <input key={fileKey} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                    </label>
                    <ActionButton
                        variant="filled"
                        disabled={!name.trim() || !image}
                        busy={uploading}
                        onClick={() => {
                            setUploading(true);
                            socket.timeout(20000).emit('createEmoji', { guildId, name: name.trim(), image }, (err, result) => {
                                setUploading(false);
                                if (err || !result?.ok) {
                                    setError(result?.error || '絵文字を作成できませんでした');
                                    return;
                                }
                                setError(null);
                                setName('');
                                setImage(null);
                                setFileKey((k) => k + 1);
                                onChanged?.();
                            });
                        }}
                    >
                        アップロード
                    </ActionButton>
                </div>
            {error && <p className="app-modal-error">{error}</p>}
            {(emojis || []).length === 0 ? (
                <EmptyState icon="😀" title="絵文字はありません" />
            ) : (
                <div className="settings-emoji-grid">
                    {(emojis || []).map((emoji) => (
                        <div key={emoji.id} className="settings-emoji-cell" title={`:${emoji.name}`}>
                            <img src={getProxyUrl(emoji.url)} alt={emoji.name} loading="lazy" />
                            <span className="truncate text-xs">{emoji.name}</span>
                            <button
                                type="button"
                                className="settings-icon-btn settings-icon-danger"
                                title="削除"
                                onClick={() => {
                                    if (!window.confirm(`:${emoji.name}: を削除しますか?`)) return;
                                    socket.timeout(15000).emit('deleteEmoji', { guildId, emojiId: emoji.id }, (err, result) => {
                                        if (!err && result?.ok) onChanged?.();
                                        else setError(result?.error || '削除できませんでした');
                                    });
                                }}
                            >
                                <FaTrash size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <StickerSection socket={socket} guildId={guildId} onChanged={onChanged} />
        </div>
    );
};

/**
 * サーバー設定: スタンプ管理 (絵文字ページの一部)
 */
const StickerSection = ({ socket, guildId, onChanged }) => {
    const [stickers, setStickers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [fileKey, setFileKey] = useState(0);
    const [uploading, setUploading] = useState(false);

    const load = useCallback(() => {
        if (!socket || !guildId) return;
        socket.timeout(15000).emit('getGuildStickers', guildId, (result) => {
            setLoading(false);
            setStickers(Array.isArray(result) ? result : []);
        });
    }, [socket, guildId]);

    useEffect(() => { load(); }, [load]);

    const handleFile = (event) => {
        const picked = event.target.files?.[0];
        if (!picked) return;
        if (!['image/png', 'image/apng', 'image/gif', 'image/lottie+json'].includes(picked.type) && !picked.name.endsWith('.json')) {
            setError('スタンプはPNG/APNG/GIF/Lottie(JSON)にしてください');
            event.target.value = '';
            return;
        }
        if (picked.size > 512 * 1024) {
            setError('スタンプは512KB未満にしてください');
            event.target.value = '';
            return;
        }
        setError(null);
        setFile(picked);
    };

    const upload = () => {
        if (!file || !name.trim() || uploading) return;
        setUploading(true);
        const reader = new FileReader();
        reader.onload = () => {
            socket.timeout(20000).emit('createSticker', {
                guildId,
                name: name.trim(),
                description: description.trim(),
                tags: name.trim(),
                file: reader.result,
            }, (err, result) => {
                setUploading(false);
                if (err || !result?.ok) {
                    setError(result?.error || 'スタンプを作成できませんでした');
                    return;
                }
                setError(null);
                setName('');
                setDescription('');
                setFile(null);
                setFileKey((k) => k + 1);
                load();
                onChanged?.();
            });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div>
            <SectionLabel>スタンプ (Sticker)</SectionLabel>
            <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                    <TextField label="スタンプの名前" value={name} maxLength={30} placeholder="my_sticker" onChange={setName} />
                </div>
                <label className="settings-btn settings-btn-outlined cursor-pointer">
                    {file ? 'ファイル選択済み' : 'ファイルを選択'}
                    <input key={fileKey} type="file" accept="image/png,image/apng,image/gif,.json" className="hidden" onChange={handleFile} />
                </label>
                <ActionButton
                    variant="filled"
                    disabled={!name.trim() || !file}
                    busy={uploading}
                    onClick={upload}
                >
                    アップロード
                </ActionButton>
            </div>
            <TextField label="説明 (任意)" value={description} maxLength={100} onChange={setDescription} />
            {error && <p className="app-modal-error">{error}</p>}
            {loading ? <LoadingSpinner /> : stickers.length === 0 ? (
                <p className="settings-card-description">スタンプはありません</p>
            ) : (
                <div className="settings-emoji-grid">
                    {stickers.map((sticker) => (
                        <div key={sticker.id} className="settings-emoji-cell" title={sticker.name}>
                            <img src={getProxyUrl(sticker.url)} alt={sticker.name} loading="lazy" />
                            <span className="truncate text-xs">{sticker.name}</span>
                            <button
                                type="button"
                                className="settings-icon-btn settings-icon-danger"
                                title="削除"
                                onClick={() => {
                                    if (!window.confirm(`${sticker.name} を削除しますか?`)) return;
                                    socket.timeout(15000).emit('deleteSticker', { guildId, stickerId: sticker.id }, (err, result) => {
                                        if (!err && result?.ok) load();
                                        else setError(result?.error || '削除できませんでした');
                                    });
                                }}
                            >
                                <FaTrash size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * サーバー設定: 通知 (自分のサーバーごとの設定)
 */
export const GuildNotificationsPage = ({ socket, guildId }) => {
    const [settings, setSettings] = useState(null);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    // 既定値はサーバーごとの設定APIからは取得できないため、ローカルの選択状態のみ管理
    const [muted, setMuted] = useState(false);
    const [messageNotifications, setMessageNotifications] = useState(1);

    const save = () => {
        setSaving(true);
        setError(null);
        socket.timeout(15000).emit('updateSelfGuildSettings', {
            guildId,
            muted,
            messageNotifications: Number(messageNotifications),
        }, (err, result) => {
            setSaving(false);
            if (err || !result?.ok) {
                setError(result?.error || '通知設定を保存できませんでした');
                return;
            }
            setSettings({ muted, messageNotifications: Number(messageNotifications) });
        });
    };

    return (
        <div className="settings-page">
            <SectionLabel>サーバーの通知設定</SectionLabel>
            <p className="settings-card-description">このサーバーに対する自分の通知設定です。</p>
            <SwitchRow title="サーバーをミュート" description="このサーバーの通知をすべてオフにします" checked={muted} onChange={setMuted} />
            <SelectField
                label="通知の設定"
                value={messageNotifications}
                options={[
                    [1, 'すべてのメッセージ'],
                    [0, 'メンションのみ'],
                    [2, '何も通知しない'],
                ]}
                onChange={(value) => setMessageNotifications(Number(value))}
            />
            <div className="settings-actions">
                <ActionButton variant="filled" onClick={save} busy={saving}>保存</ActionButton>
            </div>
            {settings && <p className="settings-saved-hint">保存しました</p>}
            {error && <p className="app-modal-error">{error}</p>}
        </div>
    );
};
