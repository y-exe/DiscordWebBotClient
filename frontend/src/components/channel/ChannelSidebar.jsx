import { useState } from 'react';
import { FaChevronRight } from 'react-icons/fa6';
import Symbol from '../common/Symbol';
import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';
import SidebarLoadingContent from './SidebarLoadingContent';

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

const CategoryIcon = ({ size = 18 }) => (
  <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path fill="currentColor" d="M3 6a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h16a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm1 5a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2H4Z" />
  </svg>
);

const ChannelIcon = ({ type, size = 18 }) => {
  switch (type) {
    case 'GUILD_VOICE':
    case 'GUILD_STAGE_VOICE':
    case 2:
    case 13:
      return <Symbol size={size}>headset_mic</Symbol>;
    case 'GUILD_NEWS':
    case 5:
      return <Symbol size={size}>campaign</Symbol>;
    case 'GUILD_FORUM':
    case 15:
      return <Symbol size={size}>forum</Symbol>;
    case 'GUILD_CATEGORY':
    case 4:
      return <Symbol size={size}>folder</Symbol>;
    default:
      return <Symbol size={size}>grid_3x3</Symbol>;
  }
};

export { ChannelIcon };

const STATUS_LABELS = {
  online: 'オンライン',
  idle: '退席中',
  dnd: '取り込み中',
  offline: 'オフライン',
  invisible: 'オフライン',
};

const ChannelName = ({ name }) => {
  const { ref } = useTwemoji();
  return <span ref={ref} className="app-menu-button-text">{name}</span>;
};

const MemberName = ({ member }) => {
  const { ref } = useTwemoji();
  return (
    <div className="app-sidebar-member-row flex h-7 items-center gap-2 rounded-full px-2 text-sm text-[var(--app-on-surface-variant)]">
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
  pendingCount = 0,
  onCreateGroup,
  loading = false,
  joinedVoiceChannelId,
  onLeaveVoice,
  canManage = false,
  canManageChannels = false,
  canInvite = false,
  onInviteChannel,
  onEditChannel,
  onChannelContextMenu,
  onCategoryContextMenu,
  onEmptyContextMenu,
  onServerSettings,
}) => {
  const isDMList = decodeURIComponent(currentGuild?.id || '') === '@me';
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
            {canManage && onServerSettings && (
              <button
                type="button"
                className="app-sidebar-header-gear"
                title="サーバー設定"
                onClick={(event) => {
                  event.stopPropagation();
                  onServerSettings();
                }}
                aria-label="サーバー設定"
              >
                <Symbol size={16} fill>settings</Symbol>
              </button>
            )}
          </div>
        </header>
      )}

      <div
        className="app-sidebar-scroll no-scrollbar"
        onContextMenu={(event) => {
          if (!isDMList) onEmptyContextMenu?.(event);
        }}
      >
        {isDMList && (
          <div className="pb-2">
            <p className="app-sidebar-title">会話</p>
            <button type="button" className="app-menu-button" data-selected={!currentChannelId} onClick={onSelectHome}>
              <md-ripple />
              <Symbol size={20}>home</Symbol>
              <span className="app-menu-button-text">ホーム</span>
            </button>
            <button type="button" className="app-menu-button" data-selected={currentChannelId === 'friends'} onClick={onSelectFriends}>
              <md-ripple />
              <Symbol size={20}>group</Symbol>
              <span className="app-menu-button-text">フレンド</span>
              {pendingCount > 0 && <span className="app-pending-badge">{pendingCount} 件のリクエスト</span>}
            </button>
            <div className="app-home-category">
              <span>ダイレクトメッセージ</span>
              {onCreateGroup && (
                <button
                  type="button"
                  className="app-home-category-add"
                  title="新しいグループを作成"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onCreateGroup();
                  }}
                  aria-label="新しいグループを作成"
                >
                  <Symbol size={20}>add</Symbol>
                </button>
              )}
            </div>
          </div>
        )}

        {loading && <SidebarLoadingContent isDMList={isDMList} />}
        {!loading && channels.map((cat) => {
          const catId = cat.id || 'uncategorized';
          const isCollapsed = collapsedCategories.has(catId);
          const isVirtual = !cat.name;
          if (!cat.channels || cat.channels.length === 0) return null;

          return (
          <section
            key={catId}
            className="app-category"
          >
            {isDMList ? null : isVirtual ? (
              <div className="app-category-title app-category-title-static" role="presentation">
                <span className="truncate" />
              </div>
            ) : (
              <div className="app-category-title-row">
                <button
                  type="button"
                  className="app-category-title"
                  onClick={() => toggleCategory(catId)}
                  onContextMenu={(event) => { event.stopPropagation(); onCategoryContextMenu?.(event, cat); }}
                >
                  <span className="truncate">{cat.name}</span>
                  <FaChevronRight size={12} className={isCollapsed ? '' : 'rotate-90'} />
                </button>
              </div>
            )}

            {!isCollapsed && cat.channels?.map((ch) => {
              const isActive = currentChannelId === ch.id;
              const isVoiceActive = joinedVoiceChannelId === ch.id;
              const isGroupDM = isDMList && (ch.type === 'GROUP_DM' || ch.type === 3);
              const dmStatus = ch.status || 'offline';
              const dmStatusLabel = STATUS_LABELS[dmStatus] || '';

              return (
                <div key={ch.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    className={`app-menu-button ${isDMList ? 'app-dm-entry' : ''}`}
                    data-selected={isActive}
                    data-attention={isVoiceActive ? 'active' : 'normal'}
                    onClick={() => onSelectChannel(ch)}
                    onContextMenu={(event) => { event.stopPropagation(); onChannelContextMenu?.(event, ch); }}
                  >
                    <md-ripple />
                    {isDMList ? (
                      <span className="app-dm-avatar-wrap">
                        <span className={isGroupDM ? 'app-avatar app-dm-avatar app-dm-avatar-group' : 'app-avatar app-dm-avatar'}>
                          {ch.avatar ? <img src={getProxyUrl(ch.avatar)} alt="" /> : (ch.name?.[0] || '?')}
                        </span>
                        {!isGroupDM && <span className="app-member-status" data-status={dmStatus} />}
                      </span>
                    ) : (
                      <ChannelIcon type={ch.type} />
                    )}
                    {isDMList ? (
                      <span className="app-dm-entry-text">
                        <ChannelName name={ch.name} />
                        <span className="app-dm-entry-sub">
                          {isGroupDM ? `${ch.memberCount || 1} 人のメンバー` : dmStatusLabel}
                        </span>
                      </span>
                    ) : (
                      <ChannelName name={ch.name} />
                    )}
                    {/* for-web Entry: ホバーで表示する行アクション */}
                    {!isDMList && (
                      <span className="app-channel-actions">
                        {canInvite && (
                          <span
                            role="button"
                            tabIndex={-1}
                            className="app-channel-action"
                            title="招待を作成"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onInviteChannel?.(ch);
                            }}
                          >
                            <Symbol size={16} fill>person_add</Symbol>
                          </span>
                        )}
                        {canManageChannels && (
                          <span
                            role="button"
                            tabIndex={-1}
                            className="app-channel-action"
                            title="チャンネル設定"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onEditChannel?.(ch);
                            }}
                          >
                            <Symbol size={16} fill>settings</Symbol>
                          </span>
                        )}
                      </span>
                    )}
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
                          onContextMenu={(event) => { event.stopPropagation(); onChannelContextMenu?.(event, { ...thread, parentId: ch.id }); }}
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
            <Symbol size={16}>call_end</Symbol>
          </md-icon-button>
        </div>
      )}
    </aside>
  );
};

export default ChannelSidebar;
