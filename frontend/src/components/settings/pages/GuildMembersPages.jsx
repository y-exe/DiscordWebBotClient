import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaBan, FaCrown, FaUserPlus } from 'react-icons/fa6';
import { getProxyUrl } from '../../../utils/helpers';
import {
    ActionButton,
    EmptyState,
    LoadingSpinner,
    PERMISSION_BITS,
    SectionLabel,
    SelectField,
    TextField,
    can,
} from '../ui';

export const GuildMembersPage = ({ socket, guildId, guild, guildRoles, myPermissions }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);

    const canKick = can(myPermissions, PERMISSION_BITS.KICK_MEMBERS);
    const canBan = can(myPermissions, PERMISSION_BITS.BAN_MEMBERS);
    const canNick = can(myPermissions, PERMISSION_BITS.MANAGE_NICKNAMES) || can(myPermissions, PERMISSION_BITS.MANAGE_GUILD);
    const canManageRoles = can(myPermissions, PERMISSION_BITS.MANAGE_ROLES);
    const canTimeout = can(myPermissions, PERMISSION_BITS.MODERATE_MEMBERS);
    const [expandedMemberId, setExpandedMemberId] = useState(null);

    const load = useCallback(() => {
        if (!socket || !guildId) return;
        socket.timeout(20000).emit('getGuildMembers', { guildId, limit: 1000 }, (err, result) => {
            setLoading(false);
            if (err || !result?.ok) {
                setError(result?.error || 'メンバーを取得できませんでした');
                return;
            }
            setMembers(result.members || []);
        });
    }, [socket, guildId]);

    useEffect(() => { load(); }, [load]);

    // 検索クエリが入力されたらサーバー検索APIを使う
    useEffect(() => {
        const query = search.trim();
        if (!query || !socket || !guildId) return undefined;
        const timer = setTimeout(() => {
            socket.timeout(15000).emit('searchGuildMembers', { guildId, query, limit: 50 }, (err, result) => {
                if (!err && result?.ok) setMembers(result.members || []);
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [search, socket, guildId]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return members;
        return members.filter((m) => {
            const name = `${m.nickname || ''} ${m.user?.displayName || ''} ${m.user?.username || ''}`.toLowerCase();
            return name.includes(query);
        });
    }, [members, search]);

    return (
        <div className="settings-page">
            <SectionLabel>メンバー ({members.length})</SectionLabel>
            <p className="settings-card-description">メンバーの管理・役職の割り当てができます。</p>
            <TextField label="検索" value={search} placeholder="メンバーを検索" onChange={setSearch} />
            {error && <p className="app-modal-error">{error}</p>}
            {loading ? <LoadingSpinner /> : (
                <div className="settings-list">
                    {filtered.map((member) => {
                        const isOwner = guild?.ownerId === member.id || member.owner;
                        return (
                            <div key={member.id} className="settings-list-row settings-member-row">
                                {member.avatar
                                    ? <img src={getProxyUrl(member.avatar)} alt="" className="h-8 w-8 rounded-full object-cover" />
                                    : <span className="settings-list-icon"><FaCrown size={13} /></span>}
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">
                                        {member.nickname || member.user?.displayName || member.user?.username}
                                        {isOwner && <span className="ml-1 text-xs text-[var(--app-outline)]">(オーナー)</span>}
                                    </span>
                                    <span className="block text-xs text-[var(--app-outline)]">@{member.user?.username}</span>
                                </span>
                                {canNick && member.id !== guild?.ownerId && (
                                    <button
                                        type="button"
                                        className="settings-icon-btn"
                                        title="ニックネームを変更"
                                        onClick={() => {
                                            const current = member.nickname || '';
                                            const next = window.prompt('ニックネームを入力 (空欄でリセット)', current);
                                            if (next === null) return;
                                            socket.timeout(15000).emit('updateMember', { guildId, userId: member.id, nickname: next }, (err, result) => {
                                                if (!err && result?.ok) load();
                                                else setError(result?.error || 'ニックネームを変更できませんでした');
                                            });
                                        }}
                                    >
                                        ✎
                                    </button>
                                )}
                                {canKick && member.id !== guild?.ownerId && (
                                    <button
                                        type="button"
                                        className="settings-icon-btn settings-icon-danger"
                                        title="キック"
                                        onClick={() => {
                                            if (!window.confirm(`${member.user?.username} をキックしますか?`)) return;
                                            socket.timeout(15000).emit('kickMember', { guildId, userId: member.id }, (err, result) => {
                                                if (!err && result?.ok) load();
                                                else setError(result?.error || 'キックできませんでした');
                                            });
                                        }}
                                    >
                                        <FaUserPlus size={13} style={{ transform: 'rotate(135deg)' }} />
                                    </button>
                                )}
                                {canBan && member.id !== guild?.ownerId && (
                                    <button
                                        type="button"
                                        className="settings-icon-btn settings-icon-danger"
                                        title="BAN"
                                        onClick={() => {
                                            if (!window.confirm(`${member.user?.username} をBANしますか?`)) return;
                                            socket.timeout(15000).emit('banMember', { guildId, userId: member.id }, (err, result) => {
                                                if (!err && result?.ok) load();
                                                else setError(result?.error || 'BANできませんでした');
                                            });
                                        }}
                                    >
                                        <FaBan size={13} />
                                    </button>
                                )}
                                {canManageRoles && (
                                    <button
                                        type="button"
                                        className="settings-icon-btn"
                                        title="役職を編集"
                                        onClick={() => setExpandedMemberId((current) => (current === member.id ? null : member.id))}
                                    >
                                        ⚙
                                    </button>
                                )}
                                {canTimeout && member.id !== guild?.ownerId && (
                                    <button
                                        type="button"
                                        className="settings-icon-btn settings-icon-danger"
                                        title="タイムアウト"
                                        onClick={() => {
                                            socket.timeout(15000).emit('updateMember', { guildId, userId: member.id, timeout: 60_000 }, (err, result) => {
                                                if (!err && result?.ok) load();
                                                else setError(result?.error || 'タイムアウトできませんでした');
                                            });
                                        }}
                                    >
                                        ⏱
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {expandedMemberId && (() => {
                const member = members.find((m) => m.id === expandedMemberId);
                if (!member) return null;
                const memberRoles = new Set(member.roles || []);
                const toggleRole = (roleId) => {
                    const next = memberRoles.has(roleId)
                        ? (memberRoles.delete(roleId), [...memberRoles])
                        : (memberRoles.add(roleId), [...memberRoles]);
                    socket.timeout(20000).emit('updateMember', { guildId, userId: member.id, roles: next }, (err, result) => {
                        if (!err && result?.ok) load();
                        else setError(result?.error || '役職を更新できませんでした');
                    });
                };
                return (
                    <div>
                        <SectionLabel>{member.nickname || member.user?.displayName || member.user?.username} の役職</SectionLabel>
                        <div className="settings-permission-grid">
                            {(guildRoles || []).map((role) => (
                                <button
                                    key={role.id}
                                    type="button"
                                    className="settings-permission-row"
                                    data-state={memberRoles.has(role.id) ? 'allow' : 'neutral'}
                                    onClick={() => toggleRole(role.id)}
                                >
                                    <span className="settings-permission-state">{memberRoles.has(role.id) ? '付与' : '未付与'}</span>
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: role.color || '#99AAB5' }} />
                                        <span className="truncate">{role.name}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        {canTimeout && (
                            <div className="settings-actions">
                                <ActionButton variant="danger" onClick={() => {
                                    socket.timeout(15000).emit('updateMember', { guildId, userId: member.id, timeout: 0 }, (err, result) => {
                                        if (!err && result?.ok) load();
                                        else setError(result?.error || 'タイムアウトを解除できませんでした');
                                    });
                                }}>
                                    タイムアウトを解除
                                </ActionButton>
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

/**
 * サーバー設定: 招待
 */