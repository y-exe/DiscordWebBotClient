import { useMemo, useState } from 'react';
import Symbol from '../common/Symbol';
import { getProxyUrl } from '../../utils/helpers';
import ChatLoadingContent from '../chat/ChatLoadingContent';

const STATUS_LABELS = {
  online: 'オンライン',
  idle: '退席中',
  dnd: '取り込み中',
  offline: 'オフライン',
  invisible: 'オフライン',
};

const statusClass = (status) => {
  if (status === 'online') return 'online';
  if (status === 'idle') return 'idle';
  if (status === 'dnd') return 'dnd';
  return 'offline';
};

const isOnline = (friend) => !['offline', 'invisible'].includes(friend.status || 'offline');

const FriendRow = ({ friend, onUserClick, onUserContextMenu }) => {
  const name = friend.displayName || friend.globalName || friend.username || '不明なユーザー';
  const status = STATUS_LABELS[friend.status] || 'オフライン';

  return (
    <article
      className="app-friend-row"
      onClick={(event) => onUserClick?.(event, friend, null)}
      onContextMenu={(event) => { event.preventDefault(); onUserContextMenu?.(event, friend, null); }}
    >
      <span className="app-friend-avatar-wrap">
        {friend.avatar ? (
          <img src={getProxyUrl(friend.avatar)} className="app-friend-avatar" alt="" loading="lazy" />
        ) : (
          <span className="app-friend-avatar app-friend-avatar-fallback">{name[0]}</span>
        )}
        <span className="app-friend-status" data-status={statusClass(friend.status)} />
      </span>
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium">
        {name}
        <span className="ml-2 text-[13px] font-normal text-[var(--app-outline)]">{status}</span>
      </span>
    </article>
  );
};

/**
 * ユーザーのセクション (for-web People)
 */
const PeopleSection = ({ title, users, loading, onUserClick, onUserContextMenu }) => (
  <section className="app-friends-section">
    <span className="app-member-group-title">
      {title} – {loading ? '...' : users.length}
    </span>
    {!loading && users.length === 0 && (
      <div className="app-friends-empty">誰もいません</div>
    )}
    {users.map((friend) => (
      <FriendRow
        key={friend.id}
        friend={friend}
        onUserClick={onUserClick}
        onUserContextMenu={onUserContextMenu}
      />
    ))}
  </section>
);

/**
 * for-web Friends: 左に Contained NavigationRail、右にユーザーリスト
 */
const FriendsView = ({ friends = [], loading = false, onUserClick, onUserContextMenu, onAddFriend }) => {
  const [page, setPage] = useState('online');

  const lists = useMemo(() => ({
    online: friends.filter((friend) => friend.relationshipType === 'friend' && isOnline(friend)),
    all: friends.filter((friend) => friend.relationshipType === 'friend'),
    incoming: friends.filter((friend) => friend.relationshipType === 'pending_incoming'),
    outgoing: friends.filter((friend) => friend.relationshipType === 'pending_outgoing'),
    blocked: friends.filter((friend) => friend.relationshipType === 'blocked'),
  }), [friends]);

  const RAIL_ITEMS = [
    { id: 'online', icon: 'waving_hand', label: 'オンライン' },
    { id: 'all', icon: 'all_inbox', label: 'すべて' },
    { id: 'pending', icon: 'notifications', label: '保留中' },
    { id: 'blocked', icon: 'block', label: 'ブロック' },
  ];

  const pendingBadge = lists.incoming.length > 99 ? '99+' : lists.incoming.length || null;

  const sectionProps = { loading, onUserClick, onUserContextMenu };

  return (
    <main className="min-w-0 flex-1 flex flex-col bg-[var(--app-surface-container-lowest)] rounded-[28px] mr-[var(--app-gap-md)] mb-[var(--app-gap-md)] text-[var(--app-on-surface)]">
      <header className="min-h-[52px] shrink-0 flex items-center gap-3.5 px-[18px] border-b border-[var(--app-outline-variant)] bg-transparent">
        <div className="flex items-center gap-[9px] text-[var(--app-on-surface)] text-[17px] font-bold whitespace-nowrap">
          <Symbol size={20}>group</Symbol>
          <span>フレンド</span>
        </div>
      </header>

      <div className="min-h-0 flex-1 flex relative">
        {/* for-web NavigationRail (contained) */}
        <nav className="app-friends-rail" aria-label="フレンドフィルター">
          <button
            type="button"
            className="app-friends-rail-add"
            title="新しいフレンドを追加"
            onClick={onAddFriend}
          >
            <Symbol size={22}>add</Symbol>
          </button>
          {RAIL_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="app-friends-rail-item"
              data-active={page === item.id}
              onClick={() => setPage(item.id)}
            >
              <span className="app-friends-rail-icon">
                <Symbol size={22}>{item.icon}</Symbol>
                {item.id === 'pending' && pendingBadge && (
                  <span className="app-friends-rail-badge">{pendingBadge}</span>
                )}
              </span>
              <span className="app-friends-rail-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="app-friends-list no-scrollbar" aria-busy={loading}>
          {loading && <ChatLoadingContent />}
          {!loading && page === 'online' && <PeopleSection title="オンライン" users={lists.online} {...sectionProps} />}
          {!loading && page === 'all' && <PeopleSection title="すべて" users={lists.all} {...sectionProps} />}
          {!loading && page === 'pending' && (
            <>
              <PeopleSection title="受信" users={lists.incoming} {...sectionProps} />
              <PeopleSection title="送信" users={lists.outgoing} {...sectionProps} />
            </>
          )}
          {!loading && page === 'blocked' && <PeopleSection title="ブロック" users={lists.blocked} {...sectionProps} />}
        </div>
      </div>
    </main>
  );
};

export default FriendsView;
