import { useMemo, useState } from 'react';
import { FaCircle, FaEllipsisVertical, FaGamepad, FaMagnifyingGlass, FaMessage, FaUserGroup } from 'react-icons/fa6';
import { getProxyUrl } from '../../utils/helpers';
import ChatLoadingContent from '../chat/ChatLoadingContent';
import { useTwemoji } from '../../hooks/useTwemoji';

const FILTERS = [
  { id: 'online', label: 'オンライン' },
  { id: 'all', label: '全て表示' },
  { id: 'pending', label: '保留中' },
];

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

const FriendName = ({ name }) => {
  const { ref } = useTwemoji();
  return <div ref={ref} className="min-w-0 overflow-hidden text-[var(--app-on-surface)] text-[15px] font-[750] leading-[1.2] text-ellipsis whitespace-nowrap">{name}</div>;
};

const FriendActivity = ({ activity }) => {
  const { ref } = useTwemoji();
  return <span ref={ref}>{activity}</span>;
};

const FriendRow = ({ friend }) => {
  const name = friend.displayName || friend.globalName || friend.username || '不明なユーザー';
  const activity = friend.activity || friend.customStatus || STATUS_LABELS[friend.status] || 'オフライン';

  return (
    <article className="app-friend-row">
      <div className="app-friend-avatar-wrap">
        {friend.avatar ? (
          <img src={getProxyUrl(friend.avatar)} className="app-friend-avatar" alt="" />
        ) : (
          <span className="app-friend-avatar app-friend-avatar-fallback">{name[0]}</span>
        )}
        <span className="app-friend-status" data-status={statusClass(friend.status)}>
          <FaCircle size={8} />
        </span>
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <FriendName name={name} />
        <div className="min-w-0 flex items-center gap-[5px] overflow-hidden text-[var(--app-on-surface-variant)] text-[13px] font-medium leading-[1.35] text-ellipsis whitespace-nowrap">
          {friend.activityType === 'PLAYING' && <FaGamepad size={12} />}
          <FriendActivity activity={activity} />
        </div>
      </div>
      <div className="flex items-center gap-0.5 ml-auto opacity-[.84]">
        <md-icon-button class="m3-icon-button" title="メッセージ">
          <FaMessage size={16} />
        </md-icon-button>
        <md-icon-button class="m3-icon-button" title="その他">
          <FaEllipsisVertical size={16} />
        </md-icon-button>
      </div>
    </article>
  );
};

const FriendsView = ({ friends = [], loading = false }) => {
  const [filter, setFilter] = useState('online');
  const [query, setQuery] = useState('');

  const filteredFriends = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return friends.filter((friend) => {
      const online = !['offline', 'invisible'].includes(friend.status || 'offline');
      const pending = friend.relationshipType === 'pending';
      if (filter === 'online' && !online) return false;
      if (filter === 'pending' && !pending) return false;
      if (filter === 'all' && pending) return false;
      if (!normalizedQuery) return true;
      return [friend.displayName, friend.globalName, friend.username]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [filter, friends, query]);

  const onlineCount = friends.filter((friend) => !['offline', 'invisible'].includes(friend.status || 'offline')).length;
  const titleCount = filter === 'online' ? onlineCount : filteredFriends.length;
  const title = filter === 'pending' ? '保留中' : filter === 'all' ? '全てのフレンド' : 'オンライン';

  return (
    <main className="min-w-0 flex-1 flex flex-col bg-[var(--app-surface-container-low)] text-[var(--app-on-surface)]">
      <header className="min-h-[52px] shrink-0 flex items-center gap-3.5 px-[18px] border-b border-[var(--app-outline-variant)] bg-[var(--app-surface-container-low)]">
        <div className="flex items-center gap-[9px] pr-1.5 text-[var(--app-on-surface)] text-[17px] font-bold whitespace-nowrap">
          <FaUserGroup size={18} />
          <span>フレンド</span>
        </div>
        <nav className="flex items-center gap-1 min-w-0" aria-label="フレンドフィルター">
          {FILTERS.map((item) => (
            <button key={item.id} type="button" className="app-friend-tab" data-active={filter === item.id} onClick={() => setFilter(item.id)}>
              <md-ripple />
              {item.label}
            </button>
          ))}
        </nav>
        <md-filled-tonal-button class="app-friend-add">フレンドに追加</md-filled-tonal-button>
      </header>

      <section className="min-h-0 flex-1 flex flex-col pt-3.5 px-[18px] pb-[18px]">
        <label className="app-friend-search">
          <FaMagnifyingGlass size={14} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="検索" />
        </label>

        <div className="shrink-0 mt-6 px-0.5 pb-3.5 text-[var(--app-on-surface)] text-sm font-[750] tracking-normal">
          {title} - {loading ? '...' : titleCount}
        </div>

        <div className="app-friend-list" aria-busy={loading}>
          {loading && (
            <ChatLoadingContent />
          )}
          {!loading && filteredFriends.map((friend) => <FriendRow key={friend.id} friend={friend} />)}
          {!loading && filteredFriends.length === 0 && (
            <div className="min-h-[160px] grid place-items-center gap-2.5 text-[var(--app-outline)] text-sm font-[650]">
              <FaUserGroup size={26} />
              <span>表示できるフレンドがありません</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default FriendsView;
