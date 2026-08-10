import { useMemo, useState } from 'react';
import { FaChevronLeft, FaClock, FaComments, FaMagnifyingGlass } from 'react-icons/fa6';

import { formatTimestamp } from '../../utils/helpers';

const ForumIcon = ({ size = 18 }) => (
  <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M18.91 12.98a5.45 5.45 0 0 1 2.18 6.2c-.1.33-.09.68.1.96l.83 1.32a1 1 0 0 1-.84 1.54h-5.5A5.6 5.6 0 0 1 10 17.5a5.6 5.6 0 0 1 5.68-5.5c1.2 0 2.32.36 3.23.98Z" />
    <path fill="currentColor" d="M19.24 10.86c.32.16.72-.02.74-.38L20 10c0-4.42-4.03-8-9-8s-9 3.58-9 8c0 1.5.47 2.91 1.28 4.11.14.21.12.49-.06.67l-1.51 1.51A1 1 0 0 0 2.4 18h5.1a.5.5 0 0 0 .49-.5c0-4.2 3.5-7.5 7.68-7.5 1.28 0 2.5.3 3.56.86Z" />
  </svg>
);

const ForumView = ({ threads = [], onSelectThread, channelName, onBack, selectedThreadId, split = false }) => {
  const [query, setQuery] = useState('');
  const filteredThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? threads.filter((thread) => thread.name?.toLowerCase().includes(normalized)) : threads;
  }, [query, threads]);

  return (
    <section className="app-forum" data-split={split ? 'true' : 'false'}>
      <header className="app-forum-header">
        <md-icon-button type="button" onClick={onBack} class="m3-icon-button md:hidden" aria-label="戻る"><FaChevronLeft size={18} /></md-icon-button>
        <span className="app-forum-title-icon"><ForumIcon size={18} /></span>
        <h2>{channelName}</h2>
      </header>

      <div className="app-forum-toolbar">
        <label className="app-forum-search">
          <FaMagnifyingGlass />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="スレッドを検索" />
        </label>
        <span className="app-forum-count">{threads.length}件</span>
      </div>

      <div className="app-forum-scroll no-scrollbar">
        {filteredThreads.length === 0 ? (
          <div className="app-forum-empty"><span><ForumIcon size={24} /></span><h3>{query ? '一致するスレッドはありません' : 'まだスレッドはありません'}</h3><p>{query ? '別のキーワードを試してください。' : '新しい会話が始まるとここに表示されます。'}</p></div>
        ) : (
          <div className="app-forum-list">
            {filteredThreads.map((thread) => (
              <button key={thread.id} type="button" className="app-forum-thread" data-selected={selectedThreadId === thread.id} onClick={() => onSelectThread(thread)}>
                <md-ripple />
                <span className="app-forum-thread-icon"><ForumIcon size={17} /></span>
                <span className="app-forum-thread-copy">
                  <strong>{thread.name}</strong>
                  <span className="app-forum-thread-meta"><span><FaComments />{thread.messageCount || 0}</span><span><FaClock />{formatTimestamp(thread.lastMessageTimestamp)}</span></span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ForumView;
