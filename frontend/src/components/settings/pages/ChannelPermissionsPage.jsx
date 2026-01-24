import { useCallback, useEffect, useMemo, useState } from 'react';
import Symbol from '../../common/Symbol';
import OverrideSwitch from '../OverrideSwitch';
import {
    ActionButton,
    EmptyState,
    LoadingSpinner,
    SectionLabel,
} from '../ui';
import { PERMISSION_CATEGORIES } from '../permissions';

/**
 * チャンネル設定: 権限の詳細設定
 */
export const ChannelPermissionsPage = ({ socket, channelId, guildId, guildRoles }) => {
    const [channel, setChannel] = useState(null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [tab, setTab] = useState('role');
    const [editing, setEditing] = useState(null); // { id, type, name, allow: BigInt, deny: BigInt }
    const [addRoleTarget, setAddRoleTarget] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState(null);

    const load = useCallback(() => {
        if (!socket || !channelId) return;
        socket.timeout(15000).emit('getChannel', { channelId }, (err, result) => {
            setLoading(false);
            const data = err ? null : result;
            if (!data?.ok) {
                setError(data?.error || '権限を取得できませんでした');
                return;
            }
            setChannel(data.channel);
        });
        if (guildId) {
            socket.timeout(20000).emit('getGuildMembers', { guildId, limit: 1000 }, (err, result) => {
                if (!err && result?.ok) setMembers(result.members || []);
            });
        }
    }, [socket, channelId, guildId]);

    useEffect(() => { load(); }, [load]);

    const overwrites = useMemo(() => channel?.permissionOverwrites || [], [channel]);
    const roleNames = useMemo(() => new Map((guildRoles || []).map((role) => [role.id, role.name])), [guildRoles]);
    const memberNames = useMemo(() => new Map(members.map((m) => [m.id, m.nickname || m.user?.displayName || m.user?.username || m.id])), [members]);
    const roleOverwrites = useMemo(() => overwrites.filter((o) => o.type === 'role'), [overwrites]);
    const memberOverwrites = useMemo(() => overwrites.filter((o) => o.type === 'member'), [overwrites]);
    const availableRoles = useMemo(() => {
        const existing = new Set(overwrites.map((o) => o.id));
        return (guildRoles || []).filter((role) => !existing.has(role.id));
    }, [overwrites, guildRoles]);

    const nameFor = (overwrite) => {
        if (overwrite.type === 'role') {
            return roleNames.get(overwrite.id) || (overwrite.id === guildId ? '@everyone' : `ロール ${overwrite.id}`);
        }
        return memberNames.get(overwrite.id) || `メンバー ${overwrite.id}`;
    };

    const updateOverwrite = (overwrite, nextAllow, nextDeny) => {
        setSaving(true);
        socket.timeout(15000).emit('updateChannelPermissions', {
            channelId, targetId: overwrite.id, type: overwrite.type,
            allow: nextAllow.toString(), deny: nextDeny.toString(),
        }, (err, result) => {
            setSaving(false);
            if (err || !result?.ok) {
                setError(result?.error || '権限を更新できませんでした');
                return;
            }
            setError(null);
            load();
        });
    };

    const removeOverwrite = (overwrite) => {
        setEditing(null);
        socket.timeout(15000).emit('deleteChannelPermission', { channelId, targetId: overwrite.id }, (err, result) => {
            if (!err && result?.ok) load();
            else setError(result?.error || '権限を削除できませんでした');
        });
    };

    const addRoleOverwrite = () => {
        if (!addRoleTarget) return;
        const role = availableRoles.find((r) => r.id === addRoleTarget);
        updateOverwrite({ id: addRoleTarget, type: 'role', name: role?.name }, 0n, 0n);
        setAddRoleTarget('');
    };

    const addMemberOverwrite = (member) => {
        if (!member?.id) return;
        updateOverwrite({ id: member.id, type: 'member', name: member.nickname || member.user?.displayName || member.user?.username }, 0n, 0n);
        setMemberSearch('');
        setMemberSearchResults(null);
    };

    const searchMembers = () => {
        const query = memberSearch.trim();
        if (!query || !socket || !guildId) return;
        socket.timeout(15000).emit('searchGuildMembers', { guildId, query, limit: 20 }, (err, result) => {
            if (!err && result?.ok) setMemberSearchResults(result.members || []);
        });
    };

    const startEdit = (overwrite) => setEditing({
        ...overwrite,
        name: nameFor(overwrite),
        allow: BigInt(overwrite.allow ?? 0),
        deny: BigInt(overwrite.deny ?? 0),
    });

    if (loading) return <LoadingSpinner />;
    if (!channel) return <EmptyState title="権限を読み込めませんでした" description={error} />;

    const listForTab = tab === 'role' ? roleOverwrites : memberOverwrites;

    return (
        <div className="settings-page">
            <div>
                <SectionLabel>詳細な権限設定</SectionLabel>
            <p className="settings-card-description">役職・メンバーごとに、このチャンネル内の権限を上書きします。</p>
            <div className="settings-tabs">
                <button type="button" className="settings-tab" data-selected={tab === 'role'} onClick={() => setTab('role')}>役職 ({roleOverwrites.length})</button>
                <button type="button" className="settings-tab" data-selected={tab === 'member'} onClick={() => setTab('member')}>メンバー ({memberOverwrites.length})</button>
            </div>

                {tab === 'role' ? (
                    <div className="app-modal-field">
                        <span className="app-modal-label">役職の権限を追加</span>
                        <div className="flex gap-2">
                            <select className="app-modal-input min-w-0 flex-1" value={addRoleTarget} onChange={(e) => setAddRoleTarget(e.target.value)}>
                                <option value="">役職を選択...</option>
                                {availableRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                            </select>
                            <ActionButton variant="tonal" onClick={addRoleOverwrite} disabled={!addRoleTarget}>追加</ActionButton>
                        </div>
                    </div>
                ) : (
                    <div className="app-modal-field">
                        <span className="app-modal-label">メンバーの権限を追加</span>
                        <div className="flex gap-2">
                            <input
                                className="app-modal-input min-w-0 flex-1"
                                value={memberSearch}
                                placeholder="ユーザー名で検索..."
                                onChange={(e) => setMemberSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchMembers(); } }}
                            />
                            <ActionButton variant="tonal" onClick={searchMembers} disabled={!memberSearch.trim()}>検索</ActionButton>
                        </div>
                        {memberSearchResults && (
                            memberSearchResults.length === 0 ? (
                                <p className="settings-card-description">該当するメンバーがいません</p>
                            ) : (
                                <div className="settings-list">
                                    {memberSearchResults.map((member) => {
                                        const exists = overwrites.some((o) => o.type === 'member' && o.id === member.id);
                                        return (
                                            <div key={member.id} className="settings-list-row">
                                                {member.avatar
                                                    ? <img src={member.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                                                    : <span className="settings-list-icon" />}
                                                <span className="min-w-0 flex-1 truncate">{member.nickname || member.user?.displayName || member.user?.username}</span>
                                                <ActionButton
                                                    variant="tonal"
                                                    disabled={exists}
                                                    onClick={() => addMemberOverwrite(member)}
                                                >
                                                    {exists ? '追加済み' : '追加'}
                                                </ActionButton>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </div>
                )}

                {listForTab.length === 0 ? (
                    <EmptyState
                        title={`${tab === 'role' ? '役職' : 'メンバー'}の上書きはありません`}
                        description="サーバーの既定の権限が使われます。"
                    />
                ) : (
                    <div className="settings-list">
                        {listForTab.map((overwrite) => (
                            <div key={`${overwrite.type}-${overwrite.id}`} className="settings-list-row">
                                <span className="settings-list-icon">
                                    <Symbol size={16}>{overwrite.type === 'member' ? 'person' : 'diversity_3'}</Symbol>
                                </span>
                                <span className="min-w-0 flex-1 truncate">{nameFor(overwrite)}</span>
                                <span className="text-xs text-[var(--app-outline)]">{overwrite.type === 'role' ? '役職' : 'メンバー'}</span>
                                <button type="button" className="settings-icon-btn" title="編集" onClick={() => startEdit(overwrite)}>
                                    <Symbol size={18}>edit</Symbol>
                                </button>
                                <button type="button" className="settings-icon-btn settings-icon-danger" title="削除" onClick={() => removeOverwrite(overwrite)}>
                                    <Symbol size={18}>delete</Symbol>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                {error && <p className="app-modal-error">{error}</p>}
            </div>

            {editing && (
                <div>
                    <SectionLabel>{editing.name} の権限</SectionLabel>
                    {PERMISSION_CATEGORIES.map((category) => (
                        <div key={category.key}>
                            <SectionLabel>{category.title}</SectionLabel>
                            {category.items.map((item) => {
                                const allowed = (editing.allow & item.bit) === item.bit;
                                const denied = (editing.deny & item.bit) === item.bit;
                                const state = allowed ? 'allow' : denied ? 'deny' : 'neutral';
                                return (
                                    <div key={item.key} className="settings-permission-override-row">
                                        <div className="settings-permission-override-text">
                                            <span className="settings-permission-override-title">{item.label}</span>
                                            <span className="settings-permission-override-description">{item.description}</span>
                                        </div>
                                        <OverrideSwitch
                                            value={state}
                                            disabled={saving}
                                            onChange={(target) => {
                                                setEditing((e) => {
                                                    let allow = e.allow & ~item.bit;
                                                    let deny = e.deny & ~item.bit;
                                                    if (target === 'allow') allow |= item.bit;
                                                    if (target === 'deny') deny |= item.bit;
                                                    return { ...e, allow, deny };
                                                });
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    <div className="settings-sticky-panel">
                        <div className="settings-action-row">
                            <button
                                type="button"
                                className="settings-btn settings-btn-text"
                                onClick={() => setEditing(null)}
                            >
                                リセット
                            </button>
                            <ActionButton
                                variant="filled"
                                busy={saving}
                                onClick={() => {
                                    updateOverwrite(editing, editing.allow, editing.deny);
                                    setEditing(null);
                                }}
                            >
                                権限を保存
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
