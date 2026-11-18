import { useEffect, useState } from 'react';
import Symbol from '../common/Symbol';
import pkg from '../../../package.json';
import {
    ChannelOverviewPage,
    ChannelPermissionsPage,
    ChannelWebhooksPage,
} from './pages/ChannelSettingsPages';
import {
    GuildAuditLogPage,
    GuildBansPage,
    GuildEmojisPage,
    GuildInvitesPage,
    GuildMembersPage,
    GuildNotificationsPage,
    GuildOverviewPage,
    GuildRolesPage,
} from './pages/GuildSettingsPages';
import { DeleteChannelPage, DeleteOrLeaveGuildPage } from './pages/DeleteConfirmPages';
import {
    AccountPage,
    ProfilePage,
    SessionsPage,
    AppearancePage,
    NotificationsPage,
    LanguagePage,
    AdvancedPage,
} from './pages/UserSettingsPages';
import { Avatar } from './pages/UserAccountPages';
import { can, PERMISSION_BITS } from './ui';

/**
 * 統合設定画面。
 * context: { type: 'user' } | { type: 'guild', guildId } | { type: 'channel', channel, guildId }
 */
const AppSettings = ({
    open = true,
    context = { type: 'user' },
    socket,
    user,
    appSettings,
    onSettingsChange,
    onReset,
    onClose,
    onLogout,
    guilds = [],
    guildRoles = [],
    guildEmojis = [],
    channels = [],
    guildData = null,
    myPermissions = 0,
    onRefresh = () => { },
    onGuildUpdated = () => { },
}) => {
    const [page, setPage] = useState(null);
    const [mobileDetail, setMobileDetail] = useState(false);

    const isGuildContext = context?.type === 'guild';
    const isChannelContext = context?.type === 'channel';
    const guildId = context?.guildId || guildData?.id;
    const contextGuild = guildData || guilds.find((g) => g.id === guildId) || null;

    const sections = (() => {
        if (isChannelContext) {
            const channel = context.channel;
            const channelName = channel?.name || 'チャンネル';
            return [
                {
                    title: channelName,
                    entries: [
                        { id: 'overview', title: '概要', icon: <Symbol size={20}>info</Symbol> },
                        ...(can(myPermissions, PERMISSION_BITS.MANAGE_ROLES) ? [{ id: 'permissions', title: '権限', icon: <Symbol size={20}>page_info</Symbol> }] : []),
                        ...(can(myPermissions, PERMISSION_BITS.MANAGE_WEBHOOKS) ? [{ id: 'webhooks', title: 'ウェブフック', icon: <Symbol size={20}>webhook</Symbol> }] : []),
                    ],
                },
                {
                    title: null,
                    danger: true,
                    entries: can(myPermissions, PERMISSION_BITS.MANAGE_CHANNELS)
                        ? [{ id: 'delete-channel', title: 'チャンネルを削除', icon: <Symbol size={20}>delete</Symbol>, danger: true }]
                        : [],
                },
            ].filter((section) => section.entries.length > 0);
        }
        if (isGuildContext) {
            const isOwner = guildData?.isOwner || false;
            return [
                {
                    title: contextGuild?.name || 'サーバー設定',
                    entries: [
                        { id: 'overview', title: '概要', icon: <Symbol size={20}>info</Symbol> },
                        { id: 'guild-notifications', title: '通知設定', icon: <Symbol size={20}>notifications</Symbol> },
                    ],
                },
                {
                    title: 'カスタマイズ',
                    entries: [
                        ...(can(myPermissions, PERMISSION_BITS.MANAGE_EXPRESSIONS) ? [{ id: 'emojis', title: '絵文字とスタンプ', icon: <Symbol size={20}>mood</Symbol> }] : []),
                    ],
                },
                {
                    title: 'ユーザー管理',
                    entries: [
                        { id: 'members', title: 'メンバー', icon: <Symbol size={20}>group</Symbol> },
                        ...(can(myPermissions, PERMISSION_BITS.MANAGE_ROLES) ? [{ id: 'roles', title: '役職', icon: <Symbol size={20}>flag</Symbol> }] : []),
                        ...(can(myPermissions, PERMISSION_BITS.MANAGE_GUILD) ? [{ id: 'invites', title: '招待', icon: <Symbol size={20}>link</Symbol> }] : []),
                        ...(can(myPermissions, PERMISSION_BITS.BAN_MEMBERS) ? [{ id: 'bans', title: 'BAN', icon: <Symbol size={20}>gavel</Symbol> }] : []),
                    ],
                },
                {
                    title: 'サーバー管理',
                    entries: [
                        ...(can(myPermissions, PERMISSION_BITS.VIEW_AUDIT_LOG) ? [{ id: 'auditlog', title: '監査ログ', icon: <Symbol size={20}>shield</Symbol> }] : []),
                    ],
                },
                {
                    title: null,
                    danger: true,
                    entries: isOwner
                        ? [{ id: 'delete-guild', title: 'サーバーを削除', icon: <Symbol size={20}>delete</Symbol>, danger: true }]
                        : [{ id: 'leave-guild', title: 'サーバーから退出', icon: <Symbol size={20}>logout</Symbol>, danger: true }],
                },
            ].filter((section) => section.entries.length > 0);
        }
        return [
            {
                title: 'ユーザー設定',
                entries: [
                    { id: 'account', title: 'マイアカウント', icon: null, hidden: true },
                    { id: 'profile', title: 'プロフィール', icon: <Symbol size={20}>account_circle</Symbol> },
                    { id: 'sessions', title: 'セッション', icon: <Symbol size={20}>verified_user</Symbol> },
                ],
            },
            {
                title: 'クライアント設定',
                entries: [
                    { id: 'appearance', title: '外観', icon: <Symbol size={20}>palette</Symbol> },
                    { id: 'notifications', title: '通知', icon: <Symbol size={20}>notifications</Symbol> },
                    { id: 'language', title: '言語', icon: <Symbol size={20}>language</Symbol> },
                ],
            },
            {
                title: null,
                entries: [
                    { href: 'https://github.com/y-exe/MaterialCord', title: 'ソースコード', icon: <Symbol size={20}>memory</Symbol> },
                    { id: 'advanced', title: '詳細設定', icon: <Symbol size={20}>science</Symbol> },
                    { id: 'logout', title: 'ログアウト', icon: <Symbol size={20}>logout</Symbol>, danger: true, action: 'logout' },
                ],
            },
        ];
    })();

    const pageTitles = (() => {
        const map = {};
        sections.forEach((section) => section.entries.forEach((entry) => { map[entry.id] = entry.title; }));
        if (isChannelContext) map.overview = 'チャンネル概要';
        if (isGuildContext) map.overview = 'サーバー概要';
        if (!isChannelContext && !isGuildContext) map.overview = 'マイアカウント';
        return map;
    })();

    // コンテキストが変わったら先頭ページへ (render 中の状態調整パターン)
    const contextKey = `${context?.type || 'user'}:${context?.channel?.id || guildId || ''}`;
    const [seenContext, setSeenContext] = useState(contextKey);
    if (open && seenContext !== contextKey) {
        setSeenContext(contextKey);
        setPage(null);
        setMobileDetail(false);
    }

    const currentPage = sections.some((section) => section.entries.some((entry) => entry.id === page))
        ? page
        : sections[0]?.entries[0]?.id || null;

    useEffect(() => {
        if (!open) return undefined;
        const onKeyDown = (event) => {
            if (event.key !== 'Escape') return;
            if (mobileDetail && window.matchMedia('(max-width: 720px)').matches) setMobileDetail(false);
            else onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, mobileDetail, onClose]);

    if (!open) return null;

    const navigate = (id) => {
        const entry = sections.flatMap((section) => section.entries).find((item) => item.id === id);
        if (entry?.action === 'logout') {
            onLogout?.();
            return;
        }
        setPage(id);
        setMobileDetail(true);
    };

    const openExternal = (href) => {
        window.open(href, '_blank', 'noopener,noreferrer');
    };

    const sharedPageProps = {
        socket,
        user,
        appSettings,
        onSettingsChange,
        onReset,
        guilds,
        guildRoles,
        guildEmojis,
        channels,
        guildData,
        myPermissions,
        guildId,
        onRefresh,
        onGuildUpdated,
        onClose,
        navigate,
    };

    return (
        <div className="settings-root" role="dialog" aria-modal="true" aria-label="設定">
            <aside className="settings-sidebar" data-mobile-hidden={mobileDetail ? 'true' : 'false'}>
                <div className="settings-sidebar-scroll no-scrollbar">
                    <div className="settings-mobile-heading">
                        <h1>設定</h1>
                        <md-icon-button type="button" class="m3-icon-button" onClick={onClose} aria-label="設定を閉じる"><Symbol size={20}>close</Symbol></md-icon-button>
                    </div>

                    <button type="button" className="settings-sidebar-button settings-back-card" onClick={onClose}>
                        <md-ripple />
                        <span className="settings-sidebar-icon"><Symbol size={20}>arrow_back</Symbol></span>
                        <span className="settings-sidebar-button-title">戻る</span>
                    </button>

                    {!isChannelContext && !isGuildContext && (
                        <button
                            type="button"
                            className="settings-account-card"
                            data-selected={currentPage === 'account'}
                            onClick={() => navigate('account')}
                        >
                            <Avatar user={user} />
                            <div className="settings-sidebar-button-content">
                                <span className="settings-sidebar-button-subtitle">{user?.displayName || user?.globalName || user?.username || 'ユーザー'}</span>
                                <span className="settings-sidebar-button-title">マイアカウント</span>
                            </div>
                        </button>
                    )}

                    {sections.map((section, index) => (
                        <div key={`${section.title ?? 'group'}-${index}`} className="settings-category-group">
                            {section.title && <span className="settings-category-title">{section.title}</span>}
                            <div className="settings-category-entries">
                                {section.entries.map((entry) => (
                                    entry.hidden ? null : (
                                        <button
                                            key={entry.id ?? entry.href}
                                            type="button"
                                            className="settings-sidebar-button"
                                            data-danger={entry.danger ? 'true' : 'false'}
                                            data-selected={currentPage === entry.id}
                                            aria-current={currentPage === entry.id ? 'page' : undefined}
                                            onClick={() => (entry.href ? openExternal(entry.href) : navigate(entry.id))}
                                        >
                                            <md-ripple />
                                            <span className="settings-sidebar-icon">{entry.icon}</span>
                                            <span className="settings-sidebar-button-title">{entry.title}</span>
                                        </button>
                                    )
                                ))}
                            </div>
                        </div>
                    ))}
                    {!isChannelContext && !isGuildContext && (
                        <div className="settings-footer-version">
                            <span className="settings-footer-version-row"><strong>バージョン:</strong> {pkg.version}</span>
                            <span className="settings-footer-legal">
                                <a href="/terms" target="_blank" rel="noopener noreferrer">規約</a>
                                <a href="/privacy" target="_blank" rel="noopener noreferrer">プライバシー</a>
                            </span>
                        </div>
                    )}
                </div>
            </aside>

            <main className="settings-content" data-mobile-visible={mobileDetail ? 'true' : 'false'}>
                <div className="settings-content-inner" key={`${contextKey}-${currentPage}`}>
                    {currentPage !== 'account' && (
                        <div className="settings-title-row">
                            <md-icon-button type="button" class="m3-icon-button settings-mobile-back" onClick={() => setMobileDetail(false)} aria-label="設定一覧に戻る"><Symbol size={20}>arrow_back</Symbol></md-icon-button>
                            <h1 className="settings-page-title">{pageTitles[currentPage] || '設定'}</h1>
                        </div>
                    )}
                    {currentPage === 'account' && <AccountPage {...sharedPageProps} />}
                    {currentPage === 'profile' && <ProfilePage {...sharedPageProps} />}
                    {currentPage === 'sessions' && <SessionsPage {...sharedPageProps} />}
                    {currentPage === 'appearance' && <AppearancePage {...sharedPageProps} />}
                    {currentPage === 'notifications' && <NotificationsPage {...sharedPageProps} />}
                    {currentPage === 'language' && <LanguagePage />}
                    {currentPage === 'advanced' && <AdvancedPage {...sharedPageProps} />}
                    {isChannelContext && currentPage === 'overview' && (
                        <ChannelOverviewPage socket={socket} channelId={context.channel?.id} onChanged={onRefresh} />
                    )}
                    {isChannelContext && currentPage === 'permissions' && (
                        <ChannelPermissionsPage socket={socket} channelId={context.channel?.id} guildId={guildId} guildRoles={guildRoles} />
                    )}
                    {isChannelContext && currentPage === 'webhooks' && (
                        <ChannelWebhooksPage socket={socket} channelId={context.channel?.id} canManage={can(myPermissions, PERMISSION_BITS.MANAGE_WEBHOOKS)} />
                    )}
                    {isChannelContext && currentPage === 'delete-channel' && (
                        <DeleteChannelPage socket={socket} channel={context.channel} onDone={onClose} />
                    )}
                    {isGuildContext && currentPage === 'overview' && (
                        <GuildOverviewPage key={guildData?.id} socket={socket} guildId={guildId} guild={guildData} channels={channels} onChanged={onRefresh} />
                    )}
                    {isGuildContext && currentPage === 'roles' && (
                        <GuildRolesPage socket={socket} guildId={guildId} guildRoles={guildRoles} myPermissions={myPermissions} />
                    )}
                    {isGuildContext && currentPage === 'members' && (
                        <GuildMembersPage socket={socket} guildId={guildId} guild={guildData} myPermissions={myPermissions} />
                    )}
                    {isGuildContext && currentPage === 'invites' && (
                        <GuildInvitesPage socket={socket} guildId={guildId} guild={{ ...guildData, channels }} />
                    )}
                    {isGuildContext && currentPage === 'bans' && (
                        <GuildBansPage socket={socket} guildId={guildId} myPermissions={myPermissions} />
                    )}
                    {isGuildContext && currentPage === 'guild-notifications' && (
                        <GuildNotificationsPage socket={socket} guildId={guildId} />
                    )}
                    {isGuildContext && currentPage === 'auditlog' && (
                        <GuildAuditLogPage socket={socket} guildId={guildId} myPermissions={myPermissions} />
                    )}
                    {isGuildContext && currentPage === 'emojis' && (
                        <GuildEmojisPage socket={socket} guildId={guildId} emojis={guildEmojis} myPermissions={myPermissions} onChanged={onRefresh} />
                    )}
                    {isGuildContext && (currentPage === 'delete-guild' || currentPage === 'leave-guild') && (
                        <DeleteOrLeaveGuildPage
                            socket={socket}
                            guild={guildData}
                            mode={currentPage === 'delete-guild' ? 'delete' : 'leave'}
                            onDone={() => { onClose(); onGuildUpdated(); }}
                        />
                    )}
                    <div className="settings-content-spacer" />
                </div>
                <div className="settings-close-area">
                    <md-icon-button type="button" class="m3-icon-button" onClick={onClose} aria-label="設定を閉じる"><Symbol size={20}>close</Symbol></md-icon-button>
                    <span className="settings-esc-label">ESC</span>
                </div>
            </main>
        </div>
    );
};

export default AppSettings;
