import { useMemo } from 'react';
import Symbol from '../common/Symbol';
import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';

const STATUS_COLORS = {
    online: '#23a55a',
    idle: '#f0b232',
    dnd: '#f23f43',
    offline: '#80848e',
};

const MemberRow = ({ member, onUserClick, onUserContextMenu, canModerate = false }) => {
    const { ref } = useTwemoji();
    const status = member.status && member.status !== 'offline' ? member.status : 'offline';
    const name = member.nickname || member.user?.displayName || member.user?.username || '不明';
    const timedOut = Boolean(member.timedOut);
    const showTimedOut = timedOut && canModerate;
    return (
        <button
            type="button"
            className="app-member-row"
            onClick={(event) => onUserClick?.(member, event)}
            onContextMenu={(event) => { event.preventDefault(); onUserContextMenu?.(member, event); }}
        >
            <span className="app-member-avatar-wrap" style={showTimedOut ? { opacity: 0.5 } : undefined}>
                {member.avatar
                    ? <img src={getProxyUrl(member.avatar)} alt="" loading="lazy" />
                    : <span className="app-member-avatar-fallback">{name[0]?.toUpperCase() || '?'}</span>}
                <span className="app-member-status" data-status={status} />
            </span>
            <span ref={ref} className="app-member-name">
                {name}
                {showTimedOut && (
                    <span className="app-member-timed-out" title="タイムアウト中">
                        <Symbol size={14}>timer_off</Symbol>
                    </span>
                )}
            </span>
            {member.user?.bot && <span className="app-member-bot-badge">BOT</span>}
        </button>
    );
};

/**
 * サーバーメンバーリスト (for-web MemberSidebar: 役職ごとにグループ化)
 */
const MemberList = ({ members = [], guildRoles = [], loading = false, canModerate = false, onUserClick, onUserContextMenu }) => {
    const groups = useMemo(() => {
        const sorted = [...members].sort((a, b) => (a.user?.username || '').localeCompare(b.user?.username || '', 'ja'));
        const roleMap = new Map(); // roleId -> members[]
        const noRole = [];
        for (const member of sorted) {
            const roles = (member.roles || []).filter((id) => id !== '@everyone');
            let assigned = false;
            for (const roleId of roles) {
                if (!roleMap.has(roleId)) roleMap.set(roleId, []);
                roleMap.get(roleId).push(member);
                assigned = true;
            }
            if (!assigned) noRole.push(member);
        }
        return { roleMap, noRole };
    }, [members]);

    const hoistRoles = useMemo(
        () => (guildRoles || []).filter((role) => role.hoist).sort((a, b) => b.position - a.position),
        [guildRoles],
    );

    if (loading) {
        return (
            <div className="app-member-panel-loading">
                {[...Array(8)].map((_, index) => <div key={index} className="app-member-skeleton" />)}
            </div>
        );
    }

    const online = members.filter((m) => m.status && m.status !== 'offline');
    const offline = members.filter((m) => !m.status || m.status === 'offline');
    const isOffline = (member) => !member.status || member.status === 'offline';
    const isLargeServer = members.length > 1000;

    const renderSection = (title, list) => list.length === 0 ? null : (
        <div key={title} className="app-member-group">
            <span className="app-member-group-title">
                {title} – {list.length}
            </span>
            {list.map((member) => (
                <MemberRow
                    key={member.id}
                    member={member}
                    canModerate={canModerate}
                    onUserClick={onUserClick}
                    onUserContextMenu={onUserContextMenu}
                />
            ))}
        </div>
    );

    // 役職ごと (hoist 役職があればそれ優先、なければオンライン/オフラインで分割)
    const hoistSections = [];
    if (hoistRoles.length > 0) {
        for (const role of hoistRoles) {
            const list = (groups.roleMap.get(role.id) || []).filter((m) => !isOffline(m));
            if (list.length > 0) hoistSections.push(renderSection(role.name, list));
        }
        const onlineNoRole = groups.noRole.filter((m) => !isOffline(m));
        if (onlineNoRole.length) hoistSections.push(renderSection('オンライン', onlineNoRole));
        const allOffline = members.filter(isOffline);
        if (allOffline.length) hoistSections.push(renderSection('オフライン', allOffline));
    } else {
        hoistSections.push(renderSection('オンライン', online));
        hoistSections.push(renderSection('オフライン', offline));
    }

    return (
        <div className="app-member-panel no-scrollbar">
            {!isLargeServer && online.length > 0 && (
                <div className="app-member-online-title">{online.length} 人がオンライン</div>
            )}
            {hoistSections}
        </div>
    );
};

export default MemberList;
