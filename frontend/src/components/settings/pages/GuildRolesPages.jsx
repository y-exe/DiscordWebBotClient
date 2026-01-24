import { useEffect, useState } from 'react';
import { FaCrown, FaTrash } from 'react-icons/fa6';
import { getProxyUrl } from '../../../utils/helpers';
import { PERMISSION_CATEGORIES } from '../permissions';
import {
    ActionButton,
    Checkbox,
    EmptyState,
    LoadingSpinner,
    PERMISSION_BITS,
    SectionLabel,
    SwitchRow,
    TextField,
    can,
} from '../ui';

const ROLE_COLOR_OPTIONS = [
    ['#5865F2', 'ブルー'], ['#EB459E', 'ピンク'], ['#23A559', 'グリーン'], ['#F23F43', 'レッド'],
    ['#F0B232', 'イエロー'], ['#FF7A45', 'オレンジ'], ['#9B59B6', 'パープル'], ['#00A8FC', 'シアン'],
];


export const GuildRolesPage = ({ socket, guildId, guildRoles, myPermissions }) => {
    const [roles, setRoles] = useState(guildRoles || []);
    const [editingRole, setEditingRole] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const reloadRoles = () => {
        socket.timeout(15000).emit('getGuildRoles', guildId, (err, data) => {
            if (!err && Array.isArray(data)) setRoles(data);
        });
    };

    const canManage = can(myPermissions, PERMISSION_BITS.MANAGE_ROLES);

    const createRole = () => {
        setBusy(true);
        socket.timeout(15000).emit('createRole', { guildId, name: '新しい役職' }, (err, result) => {
            setBusy(false);
            if (err || !result?.ok) {
                setError(result?.error || '役職を作成できませんでした');
                return;
            }
            setError(null);
            reloadRoles();
        });
    };

    if (!canManage) {
        return <EmptyState title="役職を管理する権限がありません" description="「役職を管理」権限が必要です。" />;
    }

    const sortedRoles = [...roles].sort((a, b) => b.position - a.position);

    return (
        <div className="settings-page">
            <SectionLabel>役職</SectionLabel>
            <p className="settings-card-description">メンバーに割り当てる役職を管理します。</p>
            <div className="settings-actions">
                <ActionButton variant="tonal" onClick={createRole} busy={busy}>役職を作成</ActionButton>
            </div>
            {error && <p className="app-modal-error">{error}</p>}
            {sortedRoles.length === 0 ? <LoadingSpinner /> : (
                <div className="settings-list">
                    {sortedRoles.map((role) => (
                        <button
                            key={role.id}
                            type="button"
                            className="settings-list-row settings-list-row-button"
                            onClick={() => setEditingRole({ ...role })}
                        >
                            {/* for-web ServerRoleOverview: RoleIcon 36px 円 (色なしは破線枠) */}
                            <span
                                className="settings-category-icon"
                                data-colour={role.color ? 'true' : 'false'}
                                data-blank={role.color ? 'false' : 'true'}
                                style={role.color ? { background: role.color } : undefined}
                            />
                            <span className="min-w-0 flex-1 truncate text-left font-medium">{role.name}</span>
                            <span className="text-xs text-[var(--app-on-secondary-container)] opacity-80">
                                {role.memberCount != null ? `${role.memberCount}人` : ''}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {editingRole && (
                <RoleEditor
                    socket={socket}
                    guildId={guildId}
                    role={editingRole}
                    onSaved={() => { setEditingRole(null); reloadRoles(); }}
                />
            )}
        </div>
    );
};

const RoleEditor = ({ socket, guildId, role, onSaved }) => {
    const [name, setName] = useState(role.name);
    const [color, setColor] = useState(role.color || '#99AAB5');
    const [hoist, setHoist] = useState(Boolean(role.hoist));
    const [mentionable, setMentionable] = useState(Boolean(role.mentionable));
    const [permissions, setPermissions] = useState(() => {
        try { return BigInt(role.permissions ?? 0); } catch { return 0n; }
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [roleMembers, setRoleMembers] = useState(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [roleCandidates, setRoleCandidates] = useState(null);
    const [permFilter, setPermFilter] = useState('');

    useEffect(() => {
        if (!socket || !guildId || !role?.id) return;
        socket.timeout(15000).emit('getRoleMembers', { guildId, roleId: role.id }, (err, result) => {
            if (!err && result?.ok) setRoleMembers(result.members || []);
        });
    }, [socket, guildId, role?.id]);

    const searchRoleCandidates = () => {
        const query = memberSearch.trim();
        if (!query || !socket || !guildId) return;
        socket.timeout(15000).emit('searchGuildMembers', { guildId, query, limit: 20 }, (err, result) => {
            if (!err && result?.ok) setRoleCandidates(result.members || []);
        });
    };

    // 役職メンバーの追加/削除 (updateMember の roles 差し替え)
    const setMemberRole = (memberId, add) => {
        if (!socket || busy) return;
        const current = (roleMembers || []).map((m) => m.id);
        const nextRoles = add
            ? [...new Set([...current, memberId])]
            : current.filter((id) => id !== memberId);
        setBusy(true);
        socket.timeout(20000).emit('updateMember', { guildId, userId: memberId, roles: nextRoles }, (err, result) => {
            setBusy(false);
            if (err || !result?.ok) {
                setError(result?.error || '役職を更新できませんでした');
                return;
            }
            setError(null);
            socket.timeout(15000).emit('getRoleMembers', { guildId, roleId: role.id }, (err2, result2) => {
                if (!err2 && result2?.ok) setRoleMembers(result2.members || []);
            });
        });
    };

    const handleSave = () => {
        if (!name.trim() || busy) return;
        setBusy(true);
        setError(null);
        const hexToNumber = (hex) => parseInt(hex.replace('#', ''), 16);
        socket.timeout(15000).emit('updateRole', {
            guildId,
            roleId: role.id,
            name: name.trim(),
            color: hexToNumber(color),
            hoist,
            mentionable,
            permissions: permissions.toString(),
        }, (err, result) => {
            setBusy(false);
            if (err || !result?.ok) {
                setError(result?.error || '保存できませんでした');
                return;
            }
            onSaved?.();
        });
    };

    const handleDelete = () => {
        if (busy) return;
        setBusy(true);
        socket.timeout(15000).emit('deleteRole', { guildId, roleId: role.id }, (err, result) => {
            setBusy(false);
            if (err || !result?.ok) {
                setError(result?.error || '削除できませんでした');
                return;
            }
            onSaved?.();
        });
    };

    return (
        <div>
            <SectionLabel>{role.name} の設定</SectionLabel>
            <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {ROLE_COLOR_OPTIONS.map(([hex]) => (
                        <button
                            key={hex}
                            type="button"
                            className="h-6 w-6 rounded-full border-2"
                            style={{ background: hex, borderColor: color === hex ? 'var(--app-on-surface)' : 'transparent' }}
                            aria-label={hex}
                            onClick={() => setColor(hex)}
                        />
                    ))}
                </div>
                <input
                    type="color"
                    className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    aria-label="カスタムカラー"
                />
            </div>
            <TextField label="役職名" value={name} maxLength={100} onChange={setName} />
            <SwitchRow title="メンバーリストに表示" description="役職ごとにメンバーを分けて表示します" checked={hoist} onChange={setHoist} />
            <SwitchRow title="誰でもメンション可能" checked={mentionable} onChange={setMentionable} />
            {roleMembers !== null && (
                <div>
                    <SectionLabel>この役職のメンバー ({roleMembers.length})</SectionLabel>
                    <div className="flex items-end gap-2 py-1">
                        <div className="min-w-0 flex-1">
                            <input
                                className="app-modal-input !py-2 text-sm"
                                placeholder="メンバーを検索して追加..."
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchRoleCandidates(); } }}
                            />
                        </div>
                        <ActionButton variant="tonal" onClick={searchRoleCandidates} disabled={!memberSearch.trim()}>検索</ActionButton>
                    </div>
                    {roleCandidates && (
                        roleCandidates.length === 0 ? (
                            <p className="settings-card-description">該当するメンバーがいません</p>
                        ) : (
                            <div className="settings-list">
                                {roleCandidates.map((member) => {
                                    const alreadyHas = roleMembers.some((m) => m.id === member.id);
                                    return (
                                        <div key={member.id} className="settings-list-row">
                                            {member.avatar
                                                ? <img src={getProxyUrl(member.avatar)} alt="" className="h-7 w-7 rounded-full object-cover" />
                                                : <span className="settings-list-icon" />}
                                            <span className="min-w-0 flex-1 truncate">{member.nickname || member.user?.displayName || member.user?.username}</span>
                                            <ActionButton
                                                variant="tonal"
                                                disabled={alreadyHas}
                                                onClick={() => setMemberRole(member.id, true)}
                                            >
                                                {alreadyHas ? '追加済み' : '追加'}
                                            </ActionButton>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                    {roleMembers.length === 0 ? (
                        <p className="settings-card-description">メンバーはいません</p>
                    ) : (
                        <div className="settings-role-members">
                            {roleMembers.slice(0, 20).map((member) => (
                                <span key={member.id} className="settings-role-member">
                                    {member.avatar
                                        ? <img src={getProxyUrl(member.avatar)} alt="" />
                                        : <span className="settings-role-member-fallback">{(member.displayName || member.username || '?')[0]}</span>}
                                    {member.nickname || member.displayName || member.username}
                                    <button
                                        type="button"
                                        className="settings-role-member-remove"
                                        title="役職を外す"
                                        onClick={() => setMemberRole(member.id, false)}
                                    >
                                        ✕
                                    </button>
                                </span>
                            ))}
                            {roleMembers.length > 20 && <span className="text-xs text-[var(--app-outline)] self-center">ほか {roleMembers.length - 20}人</span>}
                        </div>
                    )}
                </div>
            )}
            <div className="flex items-center gap-2 pt-2">
                <input
                    className="app-modal-input !py-2 text-sm"
                    placeholder="権限を検索..."
                    value={permFilter}
                    onChange={(e) => setPermFilter(e.target.value)}
                />
            </div>
            {PERMISSION_CATEGORIES.map((category) => {
                const items = category.items.filter((item) => {
                    if (!permFilter.trim()) return true;
                    const q = permFilter.trim().toLowerCase();
                    return item.label.toLowerCase().includes(q) || item.key.toLowerCase().includes(q);
                });
                if (items.length === 0) return null;
                return (
                    <div key={category.key}>
                        <SectionLabel>{category.title}</SectionLabel>
                        {items.map((item) => {
                            const enabled = (permissions & item.bit) !== 0n;
                            return (
                                <div key={item.key} className="settings-permission-override-row">
                                    <div className="settings-permission-override-text">
                                        <span className="settings-permission-override-title">{item.label}</span>
                                        <span className="settings-permission-override-description">{item.description}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="settings-perm-checkbox"
                                        data-checked={enabled}
                                        aria-checked={enabled}
                                        role="checkbox"
                                        disabled={busy}
                                        onClick={() => setPermissions((p) => (enabled ? p & ~item.bit : p | item.bit))}
                                    >
                                        {enabled && (
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                                                <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
            <div className="settings-sticky-panel">
                <div className="settings-action-row">
                    <button type="button" className="settings-btn settings-btn-text" onClick={() => setPermissions(() => {
                        try { return BigInt(role.permissions ?? 0); } catch { return 0n; }
                    })} disabled={busy}>
                        リセット
                    </button>
                    <ActionButton variant="filled" onClick={handleSave} busy={busy}>権限を保存</ActionButton>
                </div>
            </div>
            <div className="settings-actions">
                <ActionButton variant="danger" onClick={handleDelete} busy={busy}>役職を削除</ActionButton>
            </div>
            {error && <p className="app-modal-error">{error}</p>}
        </div>
    );
};

/**
 * サーバー設定: メンバー
 */