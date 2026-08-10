import { useState } from 'react';
import { FaChevronRight, FaHashtag, FaHouse, FaUserGroup, FaUserPlus, FaVolumeHigh } from 'react-icons/fa6';
import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';

const AnnouncementIcon = ({ size = 18 }) => (
  <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" fillRule="evenodd" d="M19.56 2a3 3 0 0 0-2.46 1.28 3.85 3.85 0 0 1-1.86 1.42l-8.9 3.18a.5.5 0 0 0-.34.47v10.09a3 3 0 0 0 2.27 2.9l.62.16c1.57.4 3.15-.56 3.55-2.12a.92.92 0 0 1 1.23-.63l2.36.94c.42.27.79.62 1.07 1.03A3 3 0 0 0 19.56 22h.94c.83 0 1.5-.67 1.5-1.5v-17c0-.83-.67-1.5-1.5-1.5h-.94Zm-8.53 15.8L8 16.7v1.73a1 1 0 0 0 .76.97l.62.15c.5.13 1-.17 1.12-.67.1-.41.29-.78.53-1.1Z" clipRule="evenodd" />
    <path fill="currentColor" d="M2 10c0-1.1.9-2 2-2h.5c.28 0 .5.22.5.5v7a.5.5 0 0 1-.5.5H4a2 2 0 0 1-2-2v-4Z" />
  </svg>
);

const ForumIcon = ({ size = 18 }) => (
  <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M18.91 12.98a5.45 5.45 0 0 1 2.18 6.2c-.1.33-.09.68.1.96l.83 1.32a1 1 0 0 1-.84 1.54h-5.5A5.6 5.6 0 0 1 10 17.5a5.6 5.6 0 0 1 5.68-5.5c1.2 0 2.32.36 3.23.98Z" />
    <path fill="currentColor" d="M19.24 10.86c.32.16.72-.02.74-.38L20 10c0-4.42-4.03-8-9-8s-9 3.58-9 8c0 1.5.47 2.91 1.28 4.11.14.21.12.49-.06.67l-1.51 1.51A1 1 0 0 0 2.4 18h5.1a.5.5 0 0 0 .49-.5c0-4.2 3.5-7.5 7.68-7.5 1.28 0 2.5.3 3.56.86Z" />
  </svg>
);

const VoiceIcon = ({ size = 18 }) => (
  <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z" />
    <path fill="currentColor" d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z" />
  </svg>
);

const ChannelIcon = ({ type }) => {
  switch (type) {
    case 'GUILD_VOICE':
    case 'GUILD_STAGE_VOICE':
    case 2:
    case 13:
      return <VoiceIcon size={18} />;
    case 'GUILD_NEWS':
    case 5:
      return <AnnouncementIcon size={18} />;
    case 'GUILD_FORUM':
    case 15:
      return <ForumIcon size={18} />;
    default:
      return <FaHashtag size={18} />;
  }
};

const ChannelName = ({ name }) => {
  const { ref } = useTwemoji();
  return <span ref={ref} className="app-menu-button-text">{name}</span>;
};

const MemberName = ({ member }) => {
  const { ref } = useTwemoji();
  return (
    <div className="flex h-7 items-center gap-2 rounded-full px-2 text-sm text-[var(--app-on-surface-variant)] hover:bg-white/5">
      <img src={getProxyUrl(member.avatar)} className="h-5 w-5 rounded-full object-cover" alt="" />
      <span ref={ref} className="truncate">{member.username}</span>
    </div>
  );
};

const ChannelSidebar = ({
  currentGuild,
  channels,
  currentChannelId,
  onSelectChannel,
  onSelectHome,
  onSelectFriends,
  joinedVoiceChannelId,
  onLeaveVoice,
}) => {
  const isDMList = currentGuild?.id === '@me';
  const bannerUrl = currentGuild?.banner ? getProxyUrl(currentGuild.banner) : null;
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  return (
    <aside className="app-sidebar">
      {!isDMList && (
        <header
          className="app-sidebar-header"
          data-image={bannerUrl ? 'true' : 'false'}
          style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
        >
          <div className="app-sidebar-header-content">
            <span className="min-w-0 flex-1 truncate">{currentGuild?.name || 'サーバーを選択'}</span>
          </div>
        </header>
      )}

      <div className="app-sidebar-scroll no-scrollbar">
        {isDMList && (
          <div className="pb-2">
            <p className="app-sidebar-title">会話</p>
            <button type="button" className="app-menu-button" data-selected={!currentChannelId} onClick={onSelectHome}>
              <md-ripple />
              <FaHouse size={18} />
              <span className="app-menu-button-text">ホーム</span>
            </button>
            <button type="button" className="app-menu-button" data-selected={currentChannelId === 'friends'} onClick={onSelectFriends}>
              <md-ripple />
              <FaUserGroup size={18} />
              <span className="app-menu-button-text">フレンド</span>
            </button>
            <div className="app-home-category">
              <span>ダイレクトメッセージ</span>
              <FaUserPlus size={18} />
            </div>
          </div>
        )}

        {channels.map((cat) => {
          const catId = cat.id || 'uncategorized';
          const isCollapsed = collapsedCategories.has(catId);
          if (!cat.channels || cat.channels.length === 0) return null;

          return (
          <section key={catId} className="app-category">
            {cat.name && !isDMList && (
              <button
                type="button"
                className="app-category-title"
                onClick={() => toggleCategory(catId)}
              >
                <span className="truncate">{cat.name}</span>
                <FaChevronRight size={12} className={isCollapsed ? '' : 'rotate-90'} />
              </button>
            )}

            {!isCollapsed && cat.channels?.map((ch) => {
              const isActive = currentChannelId === ch.id;
              const isVoiceActive = joinedVoiceChannelId === ch.id;

              return (
                <div key={ch.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="app-menu-button"
                    data-selected={isActive}
                    data-attention={isVoiceActive ? 'active' : 'normal'}
                    onClick={() => onSelectChannel(ch)}
                  >
                    <md-ripple />
                    {isDMList ? (
                      <span className="app-avatar !w-8 !h-8 text-xs">
                        {ch.avatar ? <img src={getProxyUrl(ch.avatar)} alt="" /> : (ch.name?.[0] || '?')}
                      </span>
                    ) : (
                      <ChannelIcon type={ch.type} />
                    )}
                    <ChannelName name={ch.name} />
                  </button>

                  {!isDMList && ch.threads?.length > 0 && !(ch.type === 'GUILD_FORUM' || ch.type === 15) && (
                    <div className="flex flex-col gap-1">
                      {ch.threads.map((thread) => (
                        <button
                          key={thread.id}
                          type="button"
                          className="app-menu-button app-thread-channel"
                          data-selected={currentChannelId === thread.id}
                          onClick={() => onSelectChannel(thread)}
                        >
                          <md-ripple />
                          <ForumIcon size={14} />
                          <ChannelName name={thread.name} />
                        </button>
                      ))}
                    </div>
                  )}

                  {!isDMList && (ch.type === 'GUILD_VOICE' || ch.type === 'GUILD_STAGE_VOICE' || ch.type === 2 || ch.type === 13) && ch.members?.length > 0 && (
                    <div className="ml-10 flex flex-col gap-1">
                      {ch.members.map((m) => (
                        <MemberName key={m.id} member={m} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
          );
        })}
      </div>

      {joinedVoiceChannelId && (
        <div className="app-user-strip text-xs text-[var(--brand-presence-online)]">
          <span className="h-2 w-2 rounded-full bg-[var(--brand-presence-online)]" />
          <span className="min-w-0 flex-1 truncate font-semibold">音声に接続中</span>
          <md-icon-button onClick={onLeaveVoice} class="m3-icon-button compact" title="通話を退出">
            <FaVolumeHigh size={14} />
          </md-icon-button>
        </div>
      )}
    </aside>
  );
};

export default ChannelSidebar;
