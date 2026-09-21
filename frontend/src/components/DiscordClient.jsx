import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { FaBell, FaChevronLeft, FaHashtag, FaInbox, FaMagnifyingGlass, FaXmark } from 'react-icons/fa6';

import ServerList from './server/ServerList';
import ChannelSidebar from './channel/ChannelSidebar';
import MessageContent from './chat/MessageContent';
import MessageComponents from './chat/MessageComponents';
import ReactionList from './chat/ReactionList';
import ChatInput from './chat/ChatInput';
import WindowHeader from './window/WindowHeader';
import MessageEmbed from './chat/MessageEmbed';
import ForumView from './chat/ForumView';
import FriendsView from './home/FriendsView';
import ImageViewer from './chat/ImageViewer';
import ChatLoadingContent from './chat/ChatLoadingContent';
import UserPopout from './overlay/UserPopout';
import MessageContextMenu from './overlay/MessageContextMenu';
import MessageToolbar from './chat/MessageToolbar';
import MessageReply from './chat/MessageReply';
import MediaPicker from './chat/MediaPicker';
import ModalDialog from './chat/ModalDialog';
import AppSettings from './settings/AppSettings';
import { formatTimestamp, getProxyUrl } from '../utils/helpers';
import { getStickerUrl, isLottieSticker } from '../utils/stickers';
import { useTwemoji } from '../hooks/useTwemoji';
import { useAppSettings } from '../hooks/useAppSettings';

const ChannelHeaderName = ({ name }) => {
    const { ref } = useTwemoji();
    return <h3 ref={ref} className="m-0 min-w-0 flex-1 truncate text-base font-semibold">{name}</h3>;
};

const MessageAuthorName = ({ name, color, onClick }) => {
    const { ref } = useTwemoji();
    return (
        <span ref={ref} className="font-semibold leading-6 cursor-pointer hover:underline" style={{ color }} onClick={onClick}>
            {name}
        </span>
    );
};

const isReadableChannel = (channel) => !['GUILD_VOICE', 'GUILD_STAGE_VOICE', 2, 13].includes(channel.type);
const lastChannelKey = (guildId) => `discord-last-channel:${guildId}`;

const DraftUploadMessage = ({ draft, user, channels, roles, guildId, navigate, guilds }) => {
    if (!draft) return null;
    const statusText = draft.status === 'failed' ? '送信に失敗しました' : '送信中...';

    return (
        <article className="app-message app-draft-message" data-status={draft.status}>
            <div className="app-message-row">
                <img src={getProxyUrl(user?.avatar)} className="app-message-avatar" alt="" />
                <div className="app-message-body">
                    <div className="app-message-meta">
                        <span className="app-message-author">{user?.displayName || user?.globalName || user?.username || '自分'}</span>
                        <span className="app-message-time">{statusText}</span>
                    </div>
                    <div className="app-message-content">
                        {draft.content && <MessageContent content={draft.content} channels={channels} guildRoles={roles} guildId={guildId} navigate={navigate} guilds={guilds} />}
                        {draft.files?.map((file) => (
                            <div key={file.id} className="app-draft-file">
                                <div className="app-draft-upload-line">
                                    {draft.status === 'failed'
                                        ? `\`${file.name}\` のアップロードに失敗しました`
                                        : `\`${file.name}\` をアップロード中... ${file.progress || 0}%`}
                                </div>
                                {file.previewUrl && (
                                    <div className="app-draft-image-frame" style={{ '--upload-progress': `${file.progress || 0}%` }}>
                                        <img src={file.previewUrl} alt={file.name} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {draft.error && <div className="app-draft-error">{draft.error}</div>}
                    </div>
                </div>
            </div>
        </article>
    );
};

const StickerPreviewMenu = ({ preview, guild, onClose }) => {
    const menuRef = useRef(null);
    const sticker = preview?.sticker;
    const anchor = preview?.anchor;

    useEffect(() => {
        if (!menuRef.current || !anchor) return;
        const menu = menuRef.current;
        const frame = requestAnimationFrame(() => {
            menu.anchorElement = anchor;
            if (typeof menu.show === 'function') {
                menu.show();
            } else {
                menu.open = true;
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [anchor, preview?.key]);

    useEffect(() => {
        const menu = menuRef.current;
        if (!menu) return undefined;
        const handleClosed = () => onClose(preview?.key);
        menu.addEventListener('closed', handleClosed);
        return () => menu.removeEventListener('closed', handleClosed);
    }, [onClose, preview?.key]);

    if (!sticker) return null;
    const stickerUrl = getStickerUrl(sticker);
    const serverName = guild?.id !== '@me' ? guild?.name : null;

    return (
        <md-menu
            ref={menuRef}
            class="app-sticker-menu"
            positioning="fixed"
            anchor-corner="start-end"
            menu-corner="start-start"
            x-offset="8"
            skip-restore-focus
        >
            <div className="app-sticker-menu-content" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                <div className="app-sticker-menu-main">
                    <div className="app-sticker-menu-preview">
                        {isLottieSticker(sticker) ? (
                            <span className="app-sticker-lottie">{sticker.name}</span>
                        ) : (
                            <img src={getProxyUrl(stickerUrl)} alt={sticker.name} />
                        )}
                    </div>
                    <div className="app-sticker-menu-copy">
                        <h3>{sticker.name}</h3>
                        <p>{sticker.description || 'このサーバーで作られたスタンプです。'}</p>
                    </div>
                </div>
                {serverName && (
                    <>
                        <md-divider />
                        <div className="app-sticker-menu-server">
                            {guild?.icon ? <img src={getProxyUrl(guild.icon)} alt="" /> : <span>{guild?.acronym || guild?.name?.slice(0, 2)}</span>}
                            <div>
                                <p>このスタンプが作られたサーバー</p>
                                <strong>{serverName}</strong>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </md-menu>
    );
};

export default function DiscordClient({ socket, user }) {
    const { guildId: paramGuildId = '@me', channelId: paramChannelId } = useParams();
    const navigate = useNavigate();
    const { setTheme } = useTheme();
    const { settings, updateSettings, resetSettings } = useAppSettings();

    const [guilds, setGuilds] = useState([]);
    const [channels, setChannels] = useState([]);
    const [messages, setMessages] = useState([]);
    const [guildEmojis, setGuildEmojis] = useState([]);
    const [guildStickers, setGuildStickers] = useState([]);
    const [guildRoles, setGuildRoles] = useState([]);
    const showMobileChat = Boolean(paramChannelId);

    const [replyingTo, setReplyingTo] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);
    const [userPopout, setUserPopout] = useState(null);
    const [mediaPicker, setMediaPicker] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editInput, setEditInput] = useState("");
    const [previewData, setPreviewData] = useState({ isOpen: false, images: [], index: 0 });
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [joinedVoiceChannelId] = useState(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [loadedChannelId, setLoadedChannelId] = useState(null);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [channelsGuildId, setChannelsGuildId] = useState(null);
    const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [uploadDraft, setUploadDraft] = useState(null);
    const [friends, setFriends] = useState([]);
    const [friendsLoading, setFriendsLoading] = useState(paramGuildId === '@me' && paramChannelId === 'friends');
    const [stickerPreview, setStickerPreview] = useState(null);
    const [slashCommands, setSlashCommands] = useState([]);
    const [activeModal, setActiveModal] = useState(null);
    const [isClosingMobileChat, setIsClosingMobileChat] = useState(false);

    const scrollRef = useRef(null);
    const contentShellRef = useRef(null);
    const closeAnimationRef = useRef(null);
    const closePendingRef = useRef(false);
    const messagesEndRef = useRef(null);
    const isFriendsRoute = paramGuildId === '@me' && paramChannelId === 'friends';

    useLayoutEffect(() => {
        closeAnimationRef.current?.cancel();
        closeAnimationRef.current = null;
        closePendingRef.current = false;
        if (!paramChannelId || window.matchMedia('(min-width: 768px)').matches) return;
        if (document.documentElement.dataset.reducedMotion === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const animation = contentShellRef.current?.animate(
            [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }],
            { duration: 300, easing: 'cubic-bezier(.2, 0, 0, 1)' }
        );
        return () => animation?.cancel();
    }, [paramChannelId]);

    const closeMobileChat = () => {
        const target = `/${paramGuildId}`;
        if (isDesktop || document.documentElement.dataset.reducedMotion === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            navigate(target);
            return;
        }
        if (closePendingRef.current) return;
        closePendingRef.current = true;
        setIsClosingMobileChat(true);
        requestAnimationFrame(() => {
            if (!closePendingRef.current) return;
            const animation = contentShellRef.current?.animate(
                [{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }],
                { duration: 260, easing: 'cubic-bezier(.4, 0, 1, 1)', fill: 'forwards' }
            );
            if (!animation) {
                closePendingRef.current = false;
                setIsClosingMobileChat(false);
                navigate(target);
                return;
            }
            closeAnimationRef.current = animation;
            animation.finished.then(() => {
                if (closeAnimationRef.current !== animation) return;
                closePendingRef.current = false;
                navigate(target);
                setIsClosingMobileChat(false);
            }).catch(() => {});
        });
    };

    useEffect(() => {
        const media = window.matchMedia('(min-width: 768px)');
        const update = () => setIsDesktop(media.matches);
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    useEffect(() => setTheme(settings.theme), [setTheme, settings.theme]);

    useEffect(() => {
        const handleShortcut = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === ',') {
                event.preventDefault();
                setSettingsOpen(true);
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                document.querySelector('[data-chat-input]')?.focus();
            }
        };
        window.addEventListener('keydown', handleShortcut);
        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    const scrollToBottom = useCallback((smooth = false) => {
        if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
    }, []);

    const startReply = useCallback((msg) => {
        setReplyingTo({
            id: msg.id,
            mention: msg.author.id !== user?.id,
            message: msg
        });
    }, [user?.id]);

    const jumpToMessage = useCallback((messageId) => {
        const el = document.getElementById(`message-${messageId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('app-message-jump');
        window.setTimeout(() => el.classList.remove('app-message-jump'), 1200);
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.emit('getGuilds', setGuilds);
    }, [socket]);

    useEffect(() => {
        if (!socket || !paramGuildId) return;

        setChannels([]);
        setLoadingChannels(true);
        setChannelsGuildId(null);
        let cancelled = false;

        socket.emit('getChannels', paramGuildId, (data) => {
            if (cancelled) return;
            setChannels(Array.isArray(data) ? data : []);
            setChannelsGuildId(paramGuildId);
            setLoadingChannels(false);
        });

        if (paramGuildId !== '@me') {
            socket.emit('getGuildEmojis', paramGuildId, setGuildEmojis);
            socket.emit('getGuildStickers', paramGuildId, setGuildStickers);
            socket.emit('getGuildRoles', paramGuildId, setGuildRoles);
        } else {
            setGuildEmojis([]);
            setGuildStickers([]);
            setGuildRoles([]);
        }

        return () => { cancelled = true; };
    }, [socket, paramGuildId]);

    useEffect(() => {
        if (paramGuildId === '@me' || channelsGuildId !== paramGuildId) return;
        const readable = channels.flatMap((category) => category.channels || []).filter(isReadableChannel);
        if (paramChannelId) {
            const viewed = readable.find((channel) => channel.id === paramChannelId)
                || readable.flatMap((channel) => channel.threads || []).find((thread) => thread.id === paramChannelId);
            if (viewed) {
                try { localStorage.setItem(lastChannelKey(paramGuildId), paramChannelId); } catch { return; }
            }
            return;
        }
        if (!isDesktop) return;
        let lastId = null;
        try { lastId = localStorage.getItem(lastChannelKey(paramGuildId)); } catch { lastId = null; }
        const lastChannel = readable.find((channel) => channel.id === lastId)
            || readable.flatMap((channel) => channel.threads || []).find((thread) => thread.id === lastId);
        const target = lastChannel || readable[0];
        if (target) navigate(`/${paramGuildId}/${target.id}`, { replace: true });
    }, [channels, channelsGuildId, isDesktop, navigate, paramChannelId, paramGuildId]);

    useEffect(() => {
        if (!socket || !paramGuildId || paramGuildId === '@me') {
            setSlashCommands([]);
            return;
        }
        socket.emit('getSlashCommands', paramGuildId, setSlashCommands);
    }, [socket, paramGuildId]);

    useEffect(() => {
        if (uploadDraft) setTimeout(() => scrollToBottom(true), 50);
    }, [uploadDraft, scrollToBottom]);

    useEffect(() => {
        if (isFriendsRoute) {
            setMessages([]);
            return;
        }
        if (!socket || !paramChannelId) {
            setMessages([]);
            return;
        }
        setHoveredMessageId(null);
        setContextMenu(null);
        let cancelled = false;
        socket.emit('getMessages', paramChannelId, (msgs) => {
            if (cancelled) return;
            setMessages(msgs);
            setLoadedChannelId(paramChannelId);
            setTimeout(() => scrollToBottom(false), 50);
        });
        return () => {
            cancelled = true;
        };
    }, [socket, paramChannelId, isFriendsRoute, scrollToBottom]);

    useEffect(() => {
        if (!socket || !isFriendsRoute) return;
        setFriendsLoading(true);
        socket.emit('getFriends', (data) => {
            setFriends(Array.isArray(data) ? data : []);
            setFriendsLoading(false);
        });
    }, [socket, isFriendsRoute]);

    useEffect(() => {
        if (!socket) return;

        const onNewMsg = (msg) => {
            if (msg.channelId === paramChannelId) {
                setMessages((p) => (p.some((m) => m.id === msg.id) ? p : [...p, msg]));
                setTimeout(() => scrollToBottom(true), 100);
            }
            if (msg.author?.id !== user?.id && document.hidden) {
                if (settings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
                    const notification = new Notification(msg.author?.displayName || msg.author?.username || '新しいメッセージ', {
                        body: msg.content || '添付ファイルが届きました',
                        icon: msg.author?.avatar ? getProxyUrl(msg.author.avatar) : undefined,
                        tag: `discord-message-${msg.channelId}`,
                    });
                    notification.onclick = () => {
                        window.focus();
                        navigate(`/${paramGuildId}/${msg.channelId}`);
                        notification.close();
                    };
                }
                if (settings.notificationSound) {
                    try {
                        const AudioContext = window.AudioContext || window.webkitAudioContext;
                        const context = new AudioContext();
                        const oscillator = context.createOscillator();
                        const gain = context.createGain();
                        oscillator.frequency.value = 660;
                        gain.gain.setValueAtTime(0.045, context.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
                        oscillator.connect(gain).connect(context.destination);
                        oscillator.start();
                        oscillator.stop(context.currentTime + 0.14);
                        oscillator.onended = () => context.close();
                    } catch { /* Autoplay policies may block notification audio. */ }
                }
            }
        };
        const onUpdMsg = (msg) => { if (msg.channelId === paramChannelId) setMessages((p) => p.map((m) => m.id === msg.id ? msg : m)); };
        const onDelMsg = ({ id }) => setMessages((p) => p.filter((m) => m.id !== id));
        const onChannelsUpd = (data) => setChannels(data);
        const onModalResponse = (modal) => setActiveModal(modal);

        socket.on('newMessage', onNewMsg);
        socket.on('messageUpdate', onUpdMsg);
        socket.on('messageDelete', onDelMsg);
        socket.on('channelsUpdate', onChannelsUpd);
        socket.on('modalResponse', onModalResponse);

        return () => {
            socket.off('newMessage', onNewMsg);
            socket.off('messageUpdate', onUpdMsg);
            socket.off('messageDelete', onDelMsg);
            socket.off('channelsUpdate', onChannelsUpd);
            socket.off('modalResponse', onModalResponse);
        };
    }, [socket, paramChannelId, paramGuildId, navigate, scrollToBottom, settings.desktopNotifications, settings.notificationSound, user?.id]);

    const handleScroll = (e) => {
        const { scrollTop } = e.currentTarget;
        if (scrollTop === 0 && messages.length > 0 && !loadingOlder) {
            setLoadingOlder(true);
            const oldestId = messages[0].id;
            const oldScrollHeight = scrollRef.current.scrollHeight;
            socket.emit('getMessages', { channelId: paramChannelId, before: oldestId }, (newMsgs) => {
                if (newMsgs && newMsgs.length > 0) {
                    setMessages((prev) => [...newMsgs, ...prev]);
                    requestAnimationFrame(() => {
                        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - oldScrollHeight;
                    });
                }
                setLoadingOlder(false);
            });
        }
    };

    const allFlattenedChannels = channels.flatMap((c) => [...(c.channels || []), ...(c.channels?.flatMap((mc) => mc.threads || []) || [])]);
    const hasReadableChannels = channels.some((category) => (category.channels || []).some(isReadableChannel));
    const currentChannel = allFlattenedChannels.find((c) => c.id === paramChannelId);
    const isForum = currentChannel?.type === 'GUILD_FORUM' || currentChannel?.type === 15;
    const parentForum = channels
        .flatMap((category) => category.channels || [])
        .find((channel) => (channel.type === 'GUILD_FORUM' || channel.type === 15) && channel.threads?.some((thread) => thread.id === paramChannelId));
    const forumContext = isForum ? currentChannel : parentForum;
    const currentGuildData = paramGuildId === '@me' ? { id: '@me', name: "ダイレクトメッセージ", acronym: "DM" } : guilds.find((g) => g.id === paramGuildId);
    const stickerPreviewGuild = stickerPreview?.sticker?.guildId ? guilds.find((g) => g.id === stickerPreview.sticker.guildId) || currentGuildData : currentGuildData;
    const isChannelLoading = Boolean(paramChannelId && loadedChannelId !== paramChannelId);
    const resolveReplyMessage = (msg) => msg.replyTo?.message || messages.find((candidate) => candidate.id === msg.replyTo?.id);
    const getPickerAnchor = (event) => {
        const rect = event?.currentTarget?.getBoundingClientRect?.();
        if (!rect) return null;
        return { right: rect.right, top: rect.top };
    };
    const pickerStyle = mediaPicker?.anchor ? {
        left: `max(8px, min(${mediaPicker.anchor.right - 400}px, calc(100vw - 408px)))`,
        top: `max(8px, ${mediaPicker.anchor.top - 405}px)`
    } : undefined;
    const openUserPopout = (event, profileUser) => {
        event.preventDefault();
        event.stopPropagation();
        const avatar = event.currentTarget.closest('.app-message')?.querySelector('.app-message-author-avatar')
            || event.currentTarget.querySelector?.('.app-user-avatar-wrap')
            || event.currentTarget;
        const { left, right, top, bottom } = avatar.getBoundingClientRect();
        setUserPopout({ anchor: { left, right, top, bottom }, userId: profileUser.id, fallbackUser: profileUser });
    };

    return (
        <div className="app-app" onClick={() => { setContextMenu(null); setUserPopout(null); setMediaPicker(null); }}>
            <WindowHeader guild={currentGuildData} />
            <div className="app-layout" data-mobile-closing={isClosingMobileChat}>
                <div className={`flex shrink-0 ${showMobileChat && !isClosingMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    <ServerList
                        guilds={guilds}
                        currentGuildId={paramGuildId}
                        user={user}
                        onSettings={() => setSettingsOpen(true)}
                        onUserClick={(e) => {
                            openUserPopout(e, user);
                        }}
                        onSelect={(gid) => navigate(`/${gid}`)}
                    />
                    <ChannelSidebar
                        currentGuild={currentGuildData}
                        channels={channels}
                        loading={loadingChannels}
                        currentChannelId={paramChannelId}
                        onSelectChannel={(ch) => navigate(`/${paramGuildId}/${ch.id}`)}
                        onSelectHome={() => navigate('/@me')}
                        onSelectFriends={() => navigate('/@me/friends')}
                        joinedVoiceChannelId={joinedVoiceChannelId}
                        onLeaveVoice={() => socket.emit('leave-voice')}
                        onServerSettings={() => setSettingsOpen(true)}
                    />
                </div>

                <div ref={contentShellRef} className={`app-content-shell ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                    {isFriendsRoute ? (
                        friendsLoading ? <ChatLoadingContent /> : <FriendsView friends={friends} />
                    ) : (
                        <>
                        {forumContext && (
                            <ForumView
                                threads={forumContext.threads || []}
                                channelName={forumContext.name}
                                selectedThreadId={parentForum ? paramChannelId : null}
                                split={Boolean(parentForum)}
                                onSelectThread={(channel) => navigate(`/${paramGuildId}/${channel.id}`)}
                                onBack={closeMobileChat}
                            />
                        )}
                        {!isForum && <main className="app-chat" data-thread-pane={parentForum ? 'true' : 'false'}>
                            <header className="app-chat-header">
                                <md-icon-button onClick={closeMobileChat} class="m3-icon-button md:hidden" title="戻る">
                                    <FaChevronLeft size={18} />
                                </md-icon-button>
                                <FaHashtag className="shrink-0" size={18} />
                                <ChannelHeaderName name={currentChannel?.name || (paramGuildId === '@me' ? 'DM' : isDesktop ? currentGuildData?.name || 'サーバー' : 'チャンネルを選択')} />
                                {parentForum && (
                                    <md-icon-button class="m3-icon-button app-thread-close" title="スレッドを閉じる" onClick={() => navigate(`/${paramGuildId}/${parentForum.id}`)}>
                                        <FaXmark size={17} />
                                    </md-icon-button>
                                )}
                                <div className="hidden items-center gap-1 sm:flex">
                                    <md-icon-button class="m3-icon-button" title="通知"><FaBell size={16} /></md-icon-button>
                                    <md-icon-button class="m3-icon-button" title="受信トレイ"><FaInbox size={17} /></md-icon-button>
                                    <div className="flex h-9 w-44 items-center gap-2 rounded-full bg-[var(--app-surface-container-high)] px-3 text-sm text-[var(--app-outline)] xl:w-56">
                                        <FaMagnifyingGlass size={12} />
                                        <span className="truncate">検索</span>
                                    </div>
                                </div>
                            </header>

                            {paramChannelId ? (
                                <>
                                    <div ref={scrollRef} onScroll={handleScroll} className="app-messages no-scrollbar" data-loading={isChannelLoading ? 'true' : 'false'} aria-busy={isChannelLoading}>
                                        {isChannelLoading ? <ChatLoadingContent /> : <>
                                        <div className="flex select-none flex-col mx-4 mt-[18px] mb-2.5 text-[var(--app-on-surface)]">
                                            <h1 className="m-0 text-[32px] leading-[1.15] font-[650]">{currentChannel?.name || '会話'}</h1>
                                            <p className="mt-1.5 mb-0 text-[var(--app-on-surface-variant)] text-base font-medium">これはチャンネル「{currentChannel?.name || '会話'}」の始まりです。</p>
                                        </div>
                                        {loadingOlder && <div className="py-4 text-center text-xs text-[var(--app-outline)]">過去のメッセージを読み込み中...</div>}
                                        {messages.map((m) => {
                                            const isMe = m.author.id === user?.id;
                                            const nameColor = (m.author.color && m.author.color !== '#000000') ? m.author.color : undefined;
                                            return (
                                                <article
                                                    id={`message-${m.id}`}
                                                    key={m.id}
                                                    className="app-message"
                                                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.pageX, y: e.pageY, message: m }); }}
                                                    onMouseEnter={() => setHoveredMessageId(m.id)}
                                                    onMouseLeave={() => setHoveredMessageId(null)}
                                                >
                                                    {hoveredMessageId === m.id && (
                                                        <MessageToolbar
                                                            message={m}
                                                            isMe={isMe}
                                                            onReply={startReply}
                                                            onEdit={(msg) => { setEditingMessageId(msg.id); setEditInput(msg.content); }}
                                                            onOpenMenu={(e) => setContextMenu({ x: e.pageX, y: e.pageY, message: m })}
                                                            onReactionOpen={(e) => {
                                                                e?.stopPropagation?.();
                                                                setMediaPicker({ mode: 'emoji', purpose: 'reaction', messageId: m.id, anchor: getPickerAnchor(e) });
                                                            }}
                                                        />
                                                    )}
                                                    {m.replyTo && (
                                                        <MessageReply
                                                            message={resolveReplyMessage(m)}
                                                            mention={m.replyTo.mention}
                                                            onClick={() => jumpToMessage(m.replyTo.id)}
                                                        />
                                                    )}
                                                    <div className="flex min-w-0">
                                                        <img
                                                            src={getProxyUrl(m.author.avatar)}
                                                            className="app-message-author-avatar w-9 h-9 shrink-0 mx-1 my-0.5 rounded-full object-cover bg-[var(--app-surface-container-highest)]"
                                                            onClick={(e) => openUserPopout(e, m.author)}
                                                            alt=""
                                                        />
                                                        <div className="min-w-0 flex-1 overflow-hidden pr-4">
                                                            <div className="flex items-baseline gap-1">
                                                                <MessageAuthorName 
                                                                    name={m.author.displayName} 
                                                                    color={nameColor} 
                                                                    onClick={(e) => openUserPopout(e, m.author)}
                                                                />
                                                                <span className="text-sm font-medium text-[var(--app-outline)]">{formatTimestamp(m.timestamp)}</span>
                                                            </div>
                                                            <div className="min-w-0 flex flex-col gap-1 text-base leading-[1.375rem]">
                                                                {editingMessageId === m.id ? (
                                                                    <div className="app-edit-box">
                                                                        <md-outlined-text-field
                                                                            class="app-edit-field m3-text-field"
                                                                            type="textarea"
                                                                            rows={editInput.split('\n').length || 1}
                                                                            value={editInput}
                                                                            onInput={(e) => setEditInput(e.currentTarget.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Escape') {
                                                                                    e.preventDefault();
                                                                                    setEditingMessageId(null);
                                                                                    return;
                                                                                }
                                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                                    e.preventDefault();
                                                                                    socket.emit('editMessage', { channelId: paramChannelId, messageId: m.id, content: editInput });
                                                                                    setEditingMessageId(null);
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                        <div className="app-edit-hint">
                                                                            <span>Escでキャンセル</span>
                                                                            <span aria-hidden="true">・</span>
                                                                            <span>Enterで保存</span>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <MessageContent content={m.content} channels={allFlattenedChannels} guildRoles={guildRoles} guildId={paramGuildId} navigate={navigate} guilds={guilds} />
                                                                )}
                                                            </div>
                                                            {m.attachments?.length > 0 && (
                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                    {m.attachments.map((att, idx) => (
                                                                        <img
                                                                            key={idx}
                                                                            src={getProxyUrl(att.url)}
                                                                            className="max-h-[300px] max-w-[min(400px,100%)] cursor-pointer rounded-[var(--app-radius-md)]"
                                                                            onClick={() => setPreviewData({ isOpen: true, images: m.attachments.map((a) => a.url), index: idx })}
                                                                            alt=""
                                                                        />
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {m.stickers?.length > 0 && (
                                                                <div className="app-message-stickers">
                                                                    {m.stickers.map((sticker) => (
                                                                        <button
                                                                            type="button"
                                                                            key={sticker.id}
                                                                            className="app-message-sticker"
                                                                            title={sticker.name}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setStickerPreview({ sticker, anchor: e.currentTarget, key: `${sticker.id}-${performance.now()}` });
                                                                            }}
                                                                        >
                                                                            {isLottieSticker(sticker) ? (
                                                                                <div className="app-sticker-lottie">{sticker.name}</div>
                                                                            ) : (
                                                                                <img src={getProxyUrl(getStickerUrl(sticker))} alt={sticker.name} />
                                                                            )}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {m.embeds?.map((e, idx) => <MessageEmbed key={idx} embed={e} channels={allFlattenedChannels} guildRoles={guildRoles} guildId={paramGuildId} navigate={navigate} />)}
                                                            <MessageComponents
                                                                components={m.components}
                                                                channelId={paramChannelId}
                                                                messageId={m.id}
                                                                guildId={paramGuildId}
                                                                socket={socket}
                                                                onModal={setActiveModal}
                                                            />
                                                            <ReactionList reactions={m.reactions} onReactionClick={(emoji, add) => {
                                                                const identifier = emoji.id ? `${emoji.name}:${emoji.id}` : (emoji.name || emoji);
                                                                const emojiKey = emoji.id || (emoji.name || emoji);
                                                                setMessages((prev) => prev.map((msg) => {
                                                                    if (msg.id !== m.id) return msg;
                                                                    const reactions = [...(msg.reactions || [])];
                                                                    const idx = reactions.findIndex((r) => (r.emoji.id || r.emoji.name) === emojiKey);
                                                                    if (idx >= 0) {
                                                                        const existing = reactions[idx];
                                                                        if (add) {
                                                                            reactions[idx] = { ...existing, count: existing.count + 1, me: true };
                                                                        } else {
                                                                            if (existing.count <= 1) {
                                                                                reactions.splice(idx, 1);
                                                                            } else {
                                                                                reactions[idx] = { ...existing, count: existing.count - 1, me: false };
                                                                            }
                                                                        }
                                                                    } else if (add) {
                                                                        reactions.push({
                                                                            emoji: emoji.id ? { name: emoji.name, id: emoji.id } : { name: emoji.name || emoji },
                                                                            count: 1,
                                                                            me: true
                                                                        });
                                                                    }
                                                                    return { ...msg, reactions };
                                                                }));
                                                                const eventName = add ? 'addReaction' : 'removeReaction';
                                                                socket.emit(eventName, { channelId: paramChannelId, messageId: m.id, emoji: identifier }, (res) => {
                                                                    if (res && res.ok === false) {
                                                                        setMessages((prev) => prev.map((msg) => {
                                                                            if (msg.id !== m.id) return msg;
                                                                            const reactions = [...(msg.reactions || [])];
                                                                            const idx = reactions.findIndex((r) => (r.emoji.id || r.emoji.name) === emojiKey);
                                                                            if (idx >= 0) {
                                                                                const existing = reactions[idx];
                                                                                if (add) {
                                                                                    if (existing.count <= 1) {
                                                                                        reactions.splice(idx, 1);
                                                                                    } else {
                                                                                        reactions[idx] = { ...existing, count: existing.count - 1, me: false };
                                                                                    }
                                                                                } else {
                                                                                    reactions[idx] = { ...existing, count: existing.count + 1, me: true };
                                                                                }
                                                                            }
                                                                            return { ...msg, reactions };
                                                                        }));
                                                                    }
                                                                });
                                                            }} />
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                        {uploadDraft && <DraftUploadMessage draft={uploadDraft} user={user} channels={allFlattenedChannels} roles={guildRoles} guildId={paramGuildId} navigate={navigate} guilds={guilds} />}
                                        <div ref={messagesEndRef} className="h-6 shrink-0" />
                                        </>}
                                    </div>
                                    <ChatInput
                                        channelName={currentChannel?.name}
                                        disabled={!paramChannelId}
                                        replyingTo={replyingTo}
                                        onSend={(t, files) => {
                                            return new Promise((resolve) => {
                                                socket.timeout(45000).emit('sendMessage', {
                                                    channelId: paramChannelId,
                                                    content: t.trim(),
                                                    files,
                                                    reply: replyingTo ? { messageId: replyingTo.id, mention: replyingTo.mention } : null
                                                }, (err, result) => {
                                                    if (err) {
                                                        resolve({ ok: false, error: 'メッセージ送信がタイムアウトしました' });
                                                        return;
                                                    }
                                                    if (result?.ok !== false) setReplyingTo(null);
                                                    resolve(result);
                                                });
                                            });
                                        }}
                                        onCancelReply={() => setReplyingTo(null)}
                                        onToggleMention={() => setReplyingTo((reply) => reply ? { ...reply, mention: !reply.mention } : reply)}
                                        onEmojiClick={(e) => {
                                            e?.stopPropagation?.();
                                            setMediaPicker({ mode: 'emoji', purpose: 'insert', anchor: getPickerAnchor(e) });
                                        }}
                                        onStickerClick={(e) => {
                                            e?.stopPropagation?.();
                                            setMediaPicker({ mode: 'sticker', purpose: 'sticker', anchor: getPickerAnchor(e) });
                                        }}
                                        onDraftChange={setUploadDraft}
                                        slashCommands={slashCommands}
                                        onSlashCommand={(cmd) => {
                                            const commandContent = `</${cmd.name}:${cmd.id}>`;
                                            socket.timeout(45000).emit('sendMessage', {
                                                channelId: paramChannelId,
                                                content: commandContent,
                                                reply: replyingTo ? { messageId: replyingTo.id, mention: replyingTo.mention } : null
                                            }, (err, result) => {
                                                if (err) return;
                                                if (result?.ok !== false) setReplyingTo(null);
                                            });
                                        }}
                                        showSendButton={settings.showSendButton}
                                    />
                                </>
                            ) : (
                                loadingChannels ? (paramGuildId === '@me'
                                    ? <div className="app-workspace-progress" role="status" aria-label="ホームを読み込み中"><md-linear-progress indeterminate /></div>
                                    : <ChatLoadingContent />) :
                                paramGuildId !== '@me' && !isDesktop ? <div className="flex-1" /> :
                                paramGuildId !== '@me' && isDesktop && hasReadableChannels ? <ChatLoadingContent /> :
                                <div className="grid flex-1 place-items-center px-6 text-center">
                                    <div className="max-w-sm">
                                        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[var(--app-radius-xl)] bg-[var(--app-surface-container-high)] text-[var(--app-outline)]">
                                            <FaHashtag size={28} />
                                        </div>
                                        {paramGuildId !== '@me' && isDesktop ? (
                                            <h2 className="mb-2 text-xl font-semibold">表示できるチャンネルがありません</h2>
                                        ) : (
                                            <>
                                                <h2 className="mb-2 text-xl font-semibold">チャンネルを選択</h2>
                                                <p className="text-sm text-[var(--app-on-surface-variant)]">左のサイドバーからテキストチャンネルまたはDMを選択してください。</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </main>}
                        </>
                    )}
                </div>
            </div>

            {settingsOpen && (
                <AppSettings
                    user={user}
                    settings={settings}
                    onSettingsChange={updateSettings}
                    onReset={resetSettings}
                    onClose={() => setSettingsOpen(false)}
                    onLogout={() => {
                        sessionStorage.removeItem('current-session');
                        socket?.disconnect();
                        window.location.assign('/login');
                    }}
                />
            )}
            {activeModal && (
                <ModalDialog
                    modal={activeModal}
                    onClose={() => setActiveModal(null)}
                    onSubmit={(customId, values) => {
                        socket?.emit('interaction', {
                            type: 'modal',
                            customId,
                            values,
                            channelId: paramChannelId,
                            guildId: paramGuildId,
                        });
                        setActiveModal(null);
                    }}
                />
            )}
            <StickerPreviewMenu
                key={stickerPreview?.key || 'sticker-preview'}
                preview={stickerPreview}
                guild={stickerPreviewGuild}
                onClose={(key) => setStickerPreview((current) => (!key || current?.key === key ? null : current))}
            />
            {previewData.isOpen && <ImageViewer images={previewData.images} initialIndex={previewData.index} onClose={() => setPreviewData({ ...previewData, isOpen: false })} />}
            {userPopout && <UserPopout userId={userPopout.userId} guildId={paramGuildId} anchor={userPopout.anchor} socket={socket} fallbackUser={userPopout.fallbackUser} onClose={() => setUserPopout(null)} />}
            {mediaPicker && (
                <div className="app-floating-picker" style={pickerStyle}>
                    <MediaPicker
                        mode={mediaPicker.mode}
                        currentGuild={currentGuildData}
                        guildEmojis={guildEmojis}
                        guildStickers={guildStickers}
                        onClose={() => setMediaPicker(null)}
                        onEmoji={(emoji) => {
                            if (mediaPicker.purpose === 'reaction') {
                                const identifier = emoji.id ? `${emoji.name}:${emoji.id}` : emoji;
                                socket.emit('addReaction', { channelId: paramChannelId, messageId: mediaPicker.messageId, emoji: identifier });
                                return;
                            }
                            const value = emoji.id ? `<:${emoji.name}:${emoji.id}>` : emoji;
                            window.dispatchEvent(new CustomEvent('insert-emoji', { detail: value }));
                        }}
                        onSticker={(sticker) => {
                            socket.timeout(45000).emit('sendMessage', {
                                channelId: paramChannelId,
                                content: '',
                                files: [],
                                stickers: [sticker.id],
                                reply: replyingTo ? { messageId: replyingTo.id, mention: replyingTo.mention } : null
                            }, () => {
                                setReplyingTo(null);
                            });
                        }}
                    />
                </div>
            )}
            {contextMenu && <MessageContextMenu x={contextMenu.x} y={contextMenu.y} message={contextMenu.message} currentUser={user} onClose={() => setContextMenu(null)} onReaction={(id, emo, add) => {
                const identifier = emo.id ? `${emo.name}:${emo.id}` : (emo.name || emo);
                socket.emit(add ? 'addReaction' : 'removeReaction', { channelId: paramChannelId, messageId: id, emoji: identifier });
            }} onReactionOpen={(e, messageId) => {
                e?.stopPropagation?.();
                setMediaPicker({ mode: 'emoji', purpose: 'reaction', messageId, anchor: getPickerAnchor(e) });
            }} onReply={startReply} onEdit={(msg) => { setEditingMessageId(msg.id); setEditInput(msg.content); }} onDelete={(id) => socket.emit('deleteMessage', { channelId: paramChannelId, messageId: id })} />}
        </div>
    );
}
