import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from '../utils/navigation';
import { useTheme } from 'next-themes';
import Symbol from './common/Symbol';

import ServerList from './server/ServerList';
import ChannelSidebar, { ChannelIcon } from './channel/ChannelSidebar';
import MessageContent from './chat/MessageContent';
import MessageItem from './chat/MessageItem';
import DraftUploadMessage from './chat/DraftUploadMessage';
import StickerPreviewMenu from './chat/StickerPreviewMenu';
import MessageContextMenu from './chat/MessageContextMenu';
import { isReadableChannel, lastChannelKey } from './chat/messageUtils';
import ReactionList from './chat/ReactionList';
import ChatInput from './chat/ChatInput';
import WindowHeader from './window/WindowHeader';
import ForumView from './chat/ForumView';
import FriendsView from './home/FriendsView';
import HomeView from './home/HomeView';
import ImageViewer from './chat/ImageViewer';
import LoadingContent from './chat/LoadingContent';
import UserPopout from './overlay/UserPopout';
import MediaPicker from './chat/MediaPicker';
import ModalDialog from './chat/ModalDialog';
import MemberList from './member/MemberList';
import AppSettings from './settings/AppSettings';
import DiscordOverlays from './overlays/DiscordOverlays';
import ActionMenu from './common/ActionMenu';
import ConfirmDialog from './common/ConfirmDialog';
import ChannelModal from './modals/ChannelModal';
import SlashCommandModal from './modals/SlashCommandModal';
import ServerModal, { JoinServerModal } from './modals/ServerModal';
import GroupModal from './modals/GroupModal';
import AddFriendModal from './modals/AddFriendModal';
import AddGroupMemberModal from './modals/AddGroupMemberModal';
import InviteModal from './modals/InviteModal';
import { PERMISSION_BITS, can } from './settings/ui';
import { formatTimestamp, getProxyUrl } from '../utils/helpers';
import { useTwemoji } from '../hooks/useTwemoji';
import { useAppSettings } from '../hooks/useAppSettings';
import { buildUserContextMenu, buildSelfMenu, buildChannelContextMenu } from './menus/menuBuilders';

const ChannelHeaderName = ({ name }) => {
    const { ref } = useTwemoji();
    return <h3 ref={ref} className="m-0 min-w-0 flex-1 truncate text-base font-semibold">{name}</h3>;
};

const MessageAuthorName = ({ name, color, onClick, onContextMenu }) => {
    const { ref } = useTwemoji();
    return (
        <span ref={ref} className="font-semibold leading-6 cursor-pointer hover:underline" style={{ color }} onClick={onClick} onContextMenu={onContextMenu}>
            {name}
        </span>
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
    const [atBottom, setAtBottom] = useState(true);
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
    // 設定 / 管理 UI
    const [settingsContext, setSettingsContext] = useState({ type: 'user' });
    const [guildData, setGuildData] = useState(null);
    const [permissionsByGuild, setPermissionsByGuild] = useState({});
    const [searchResults, setSearchResults] = useState(null); // {query, total, messages, channelName}
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [rightPanel, setRightPanel] = useState(null); // null | 'members' | 'pins' | 'search'
    const [guildMembers, setGuildMembers] = useState([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [pinsLoading, setPinsLoading] = useState(false);
    const [typingUsers, setTypingUsers] = useState({});
    // モーダル / メニュー
    const [channelModal, setChannelModal] = useState(null); // {mode, channel?, defaultParentId?}
    const [channelModalBusy, setChannelModalBusy] = useState(false);
    const [channelModalError, setChannelModalError] = useState(null);
    const [channelDeleteTarget, setChannelDeleteTarget] = useState(null);
    const [slashCommand, setSlashCommand] = useState(null);
    const [slashBusy, setSlashBusy] = useState(false);
    const [slashError, setSlashError] = useState(null);
    const [serverModalOpen, setServerModalOpen] = useState(false);
    const [serverModalBusy, setServerModalBusy] = useState(false);
    const [serverModalError, setServerModalError] = useState(null);
    const [joinModalOpen, setJoinModalOpen] = useState(false);
    const [joinModalBusy, setJoinModalBusy] = useState(false);
    const [joinModalError, setJoinModalError] = useState(null);
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupModalBusy, setGroupModalBusy] = useState(false);
    const [groupModalError, setGroupModalError] = useState(null);
    const [addFriendModalOpen, setAddFriendModalOpen] = useState(false);
    const [addFriendModalBusy, setAddFriendModalBusy] = useState(false);
    const [addFriendModalError, setAddFriendModalError] = useState(null);
    const [addFriendModalSuccess, setAddFriendModalSuccess] = useState(null);
    const [emojiGroups, setEmojiGroups] = useState([]);
const [groupMemberTarget, setGroupMemberTarget] = useState(null); // { channel }
    const [groupMemberBusy, setGroupMemberBusy] = useState(false);
    const [groupMemberError, setGroupMemberError] = useState(null);
    const [inviteModal, setInviteModal] = useState(null); // {channelId, channelName}
    const [invite, setInvite] = useState(null);
    const [inviteBusy, setInviteBusy] = useState(false);
    const [inviteError, setInviteError] = useState(null);
    const [actionMenu, setActionMenu] = useState(null); // {x, y, items}
    const [guildSelfSettings, setGuildSelfSettings] = useState({}); // guildId -> {muted, messageNotifications, ...}

    const scrollRef = useRef(null);
    const recentMessages = useRef(new Map());
    const contentShellRef = useRef(null);
    const closeAnimationRef = useRef(null);
    const closePendingRef = useRef(false);
    const messagesEndRef = useRef(null);
    const typingEmitRef = useRef(0);
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
        setAtBottom(true);
    }, []);

    const startReply = useCallback((msg) => {
        setReplyingTo({
            id: msg.id,
            mention: msg.author.id !== user?.id,
            self: msg.author.id === user?.id,
            message: msg
        });
    }, [user?.id]);

    const jumpToMessage = useCallback((messageId) => {
        const el = document.getElementById(`message-${messageId}`);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('app-message-jump');
        window.setTimeout(() => el.classList.remove('app-message-jump'), 3000);
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.emit('getGuilds', setGuilds);
    }, [socket]);

    useEffect(() => {
        if (!socket || !paramGuildId) return;

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
        }

        return () => {
            cancelled = true;
            setChannelsGuildId(null);
            setLoadingChannels(true);
            setGuildEmojis([]);
            setGuildStickers([]);
            setGuildRoles([]);
        };
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
            return () => setSlashCommands([]);
        }
        socket.emit('getSlashCommands', paramGuildId, setSlashCommands);
        return () => setSlashCommands([]);
    }, [socket, paramGuildId]);

    // サーバー詳細 (権限など) の取得
    useEffect(() => {
        if (!socket || paramGuildId === '@me') {
            return () => setGuildData(null);
        }
        let cancelled = false;
        socket.timeout(15000).emit('getGuild', { guildId: paramGuildId }, (err, result) => {
            if (cancelled || err) return;
            if (result?.ok) setGuildData(result.guild);
        });
        return () => {
            cancelled = true;
            setGuildData(null);
        };
    }, [socket, paramGuildId]);

    // 全サーバーの自分の権限を一括取得 (管理UIの出し分け用)
    // レート制限で失敗することがあるため、失敗時は30秒間隔で再試行する
    useEffect(() => {
        if (!socket) return undefined;
        let retryTimer = null;
        let attempts = 0;
        const fetchPermissions = () => {
            socket.timeout(15000).emit('getSelfPermissions', (err, result) => {
                if (err || !result?.ok) {
                    if (attempts < 10) {
                        attempts += 1;
                        retryTimer = setTimeout(fetchPermissions, 30_000);
                    }
                    return;
                }
                window.__permissionsByGuild = result.permissions || {};
                setPermissionsByGuild(result.permissions || {});
            });
        };
        fetchPermissions();
        return () => clearTimeout(retryTimer);
    }, [socket, guilds]);

    // 0 のキャッシュはフォールバックを打ち消さないようにする(レート制限時の退行防止)
    // 開発者モード時は権限がなくても管理UIを強制表示する(操作はサーバー側で403になる)
    // 権限ビットは 2^53 を超えるため文字列のまま扱い、can() 内で BigInt 変換する
    const cachedPermissions = permissionsByGuild[paramGuildId];
    const guildFallbackPermissions = guildData?.id === paramGuildId
        ? (guildData?.isOwner ? '8' : String(guildData?.myPermissions || '0'))
        : '0';
    const myPermissions = settings.developerMode
        ? '8'
        : ((cachedPermissions && BigInt(cachedPermissions) > 0n)
            ? cachedPermissions
            : guildFallbackPermissions);
    const canManageChannels = can(myPermissions, PERMISSION_BITS.MANAGE_CHANNELS);
    const canManageMessages = can(myPermissions, PERMISSION_BITS.MANAGE_MESSAGES);
    const canKick = can(myPermissions, PERMISSION_BITS.KICK_MEMBERS);
    const canBan = can(myPermissions, PERMISSION_BITS.BAN_MEMBERS);
    const canTimeout = can(myPermissions, PERMISSION_BITS.MODERATE_MEMBERS);
    const canCreateInvite = can(myPermissions, PERMISSION_BITS.CREATE_INVITE);
    const canManageGuildLike = canManageChannels
        || can(myPermissions, PERMISSION_BITS.MANAGE_GUILD)
        || can(myPermissions, PERMISSION_BITS.MANAGE_ROLES)
        || can(myPermissions, PERMISSION_BITS.MANAGE_EXPRESSIONS)
        || can(myPermissions, PERMISSION_BITS.BAN_MEMBERS);

    // リアルタイム: チャンネル・サーバーの更新とタイピング
    useEffect(() => {
        if (!socket) return undefined;
        let refetchTimer = null;
        const scheduleChannelRefetch = () => {
            clearTimeout(refetchTimer);
            refetchTimer = setTimeout(() => {
                socket.emit('getChannels', paramGuildId, (data) => setChannels(Array.isArray(data) ? data : []));
                if (paramGuildId !== '@me') {
                    socket.emit('getGuilds', setGuilds);
                    socket.timeout(15000).emit('getGuild', { guildId: paramGuildId }, (err, result) => {
                        if (!err && result?.ok) setGuildData(result.guild);
                    });
                }
            }, 300);
        };
        const onTyping = (data) => {
            if (!data?.userId || data.userId === user?.id) return;
            setTypingUsers((prev) => ({ ...prev, [data.userId]: { name: data.displayName || data.username, at: Date.now() } }));
        };
        socket.on('channelCreate', scheduleChannelRefetch);
        socket.on('channelUpdate', scheduleChannelRefetch);
        socket.on('channelDelete', scheduleChannelRefetch);
        socket.on('guildUpdate', scheduleChannelRefetch);
        socket.on('typingStart', onTyping);
        return () => {
            clearTimeout(refetchTimer);
            socket.off('channelCreate', scheduleChannelRefetch);
            socket.off('channelUpdate', scheduleChannelRefetch);
            socket.off('channelDelete', scheduleChannelRefetch);
            socket.off('guildUpdate', scheduleChannelRefetch);
            socket.off('typingStart', onTyping);
        };
    }, [socket, paramGuildId, user?.id]);

    // タイピング表示の自動クリア
    useEffect(() => {
        if (Object.keys(typingUsers).length === 0) return undefined;
        const timer = setInterval(() => {
            const now = Date.now();
            setTypingUsers((prev) => {
                const next = {};
                let changed = false;
                for (const [userId, info] of Object.entries(prev)) {
                    if (now - info.at < 7000) next[userId] = info;
                    else changed = true;
                }
                return changed ? next : prev;
            });
        }, 2000);
        return () => clearInterval(timer);
    }, [typingUsers]);

    // 右パネル: チャンネル切替時に検索結果をリセット
    useEffect(() => {
        setSearchResults(null);
        setSearchQuery('');
    }, [paramChannelId, paramGuildId]);

    // ヘッダーの検索ボックス入力で自動検索
    useEffect(() => {
        if (rightPanel !== 'search' || !searchQuery.trim() || !socket) return;
        const query = searchQuery.trim();
        setSearching(true);
        const timer = setTimeout(() => {
            socket.timeout(15000).emit('searchMessages', {
                query,
                ...(paramGuildId !== '@me' ? { guildId: paramGuildId } : {}),
                ...(paramChannelId ? { channelId: paramChannelId } : {}),
            }, (err, result) => {
                setSearching(false);
                if (err || !result?.ok) {
                    setSearchResults({ query, total: 0, messages: [], error: result?.error || '検索できませんでした' });
                    return;
                }
                setSearchResults({ query, total: result.total || 0, messages: result.messages || [] });
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, rightPanel, socket, paramGuildId, paramChannelId]);

    // 右パネル: メンバー / ピン留め
    useEffect(() => {
        if (rightPanel === 'members' && paramGuildId !== '@me' && socket) {
            setMembersLoading(true);
            socket.timeout(20000).emit('getGuildMembers', { guildId: paramGuildId, limit: 1000 }, (err, result) => {
                setMembersLoading(false);
                if (!err && result?.ok) setGuildMembers(result.members || []);
            });
        }
        if (rightPanel === 'pins' && paramChannelId && socket) {
            setPinsLoading(true);
            socket.timeout(15000).emit('getPinnedMessages', { channelId: paramChannelId }, (err, result) => {
                setPinsLoading(false);
                if (!err && result?.ok) setPinnedMessages(result.messages || []);
                else setPinnedMessages([]);
            });
        }
    }, [socket, rightPanel, paramGuildId, paramChannelId]);

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
        const cached = recentMessages.current.get(paramChannelId);
        if (cached) {
            setMessages(cached);
            setLoadedChannelId(paramChannelId);
            requestAnimationFrame(() => scrollToBottom(false));
        }
        setHoveredMessageId(null);
        setContextMenu(null);
        let cancelled = false;
        socket.emit('getMessages', paramChannelId, (msgs) => {
            if (cancelled) return;
            const nextMessages = Array.isArray(msgs) ? msgs : [];
            recentMessages.current.delete(paramChannelId);
            recentMessages.current.set(paramChannelId, nextMessages);
            if (recentMessages.current.size > 12) recentMessages.current.delete(recentMessages.current.keys().next().value);
            setMessages(nextMessages);
            setLoadedChannelId(paramChannelId);
            setTimeout(() => scrollToBottom(false), 50);
        });
        return () => {
            cancelled = true;
        };
    }, [socket, paramChannelId, isFriendsRoute, scrollToBottom]);

    useEffect(() => {
        if (!socket || paramGuildId !== '@me') return;
        setFriendsLoading(true);
        socket.emit('getFriends', (data) => {
            setFriends(Array.isArray(data) ? data : []);
            setFriendsLoading(false);
        });
    }, [socket, paramGuildId]);

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
                    } catch { /* 通知音の再生に失敗しても無視 */ }
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
        const el = e.currentTarget;
        setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
        const { scrollTop } = el;
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
    // メンションの表示名解決用ユーザーマップ
    const usersById = useMemo(() => {
        const map = {};
        for (const member of guildMembers || []) {
            if (member?.id) {
                // 最も高い位置のカラー役職を表示色に使用
                let color = null;
                if (guildRoles?.length && Array.isArray(member.roles)) {
                    const found = guildRoles
                        .filter((r) => member.roles.includes(r.id) && r.color && r.color !== '#000000')
                        .sort((a, b) => (b.position || 0) - (a.position || 0))[0];
                    if (found) color = found.color;
                }
                map[member.id] = {
                    name: member.nickname || member.user?.displayName || member.user?.username || member.id,
                    color,
                };
            }
        }
        for (const msg of messages) {
            if (msg.author?.id && !map[msg.author.id]) {
                map[msg.author.id] = { name: msg.author.displayName || msg.author.username || msg.author.id, color: msg.author.color || null };
            }
        }
        return map;
    }, [guildMembers, guildRoles, messages]);
    // @ 補完候補 (メンバー + フレンド)
    const mentionCandidates = useMemo(() => {
        const list = Object.entries(usersById).map(([id, info]) => ({
            id,
            name: info.name,
            avatar: friends.find((f) => f.id === id)?.avatar || null,
        }));
        for (const friend of friends) {
            if (friend.relationshipType === 'friend' && !list.some((item) => item.id === friend.id)) {
                list.push({ id: friend.id, name: friend.displayName || friend.username, avatar: friend.avatar });
            }
        }
        return list;
    }, [usersById, friends]);
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

    const openUserContextMenu = (event, targetUser, member = null) => {
        const relationship = friends.find((f) => f.id === targetUser.id)?.relationshipType || null;
        setActionMenu(buildUserContextMenu(event, {
            user, targetUser, member, relationship,
            guildId: paramGuildId,
        currentGuildData,
            hasChannel: Boolean(paramChannelId),
            canTimeout, canKick, canBan,
            openUserPopout, socket, navigate,
        }));
    };
    const openSelfMenu = (event) => {
        setActionMenu(buildSelfMenu(event, {
            user, openUserPopout, socket,
            onOpenSettings: () => { setSettingsContext({ type: 'user' }); setSettingsOpen(true); },
        }));
    };
    const isDMView = paramGuildId === '@me';

    const openInviteForChannel = (channel) => {
        if (!channel?.id) return;
        setInvite(null);
        setInviteError(null);
        setInviteModal({ channelId: channel.id, channelName: channel.name || 'チャンネル' });
    };

    const openInviteForGuild = async (guildId) => {
        if (!socket) return;
        socket.emit('getChannels', guildId, (data) => {
            const categories = Array.isArray(data) ? data : [];
            const firstText = categories.flatMap((cat) => cat.channels || []).find((ch) => !['GUILD_VOICE', 'GUILD_STAGE_VOICE', 2, 13, 4, 'GUILD_CATEGORY'].includes(ch.type));
            if (firstText) openInviteForChannel(firstText);
            else setInviteError(null);
        });
    };

    const loadGuildSelfSettings = (guildId) => {
        if (!socket || !guildId || guildId === '@me') return;
        socket.timeout(15000).emit('getSelfGuildSettings', { guildId }, (err, result) => {
            if (!err && result?.ok) {
                setGuildSelfSettings((current) => ({ ...current, [guildId]: result.settings }));
            }
        });
    };

    const saveGuildSelfSettings = (guildId, patch) => {
        if (!socket || !guildId || guildId === '@me') return;
        socket.timeout(15000).emit('updateSelfGuildSettings', { guildId, ...patch }, (err, result) => {
            if (!err && result?.ok) {
                setGuildSelfSettings((current) => ({
                    ...current,
                    [guildId]: {
                        ...(current[guildId] || {}),
                        ...(patch.muted !== undefined ? { muted: patch.muted } : {}),
                        ...(patch.mute !== undefined ? { muted: patch.mute !== false && patch.mute !== 0 } : {}),
                        ...(patch.messageNotifications !== undefined ? { messageNotifications: patch.messageNotifications } : {}),
                    },
                }));
            }
        });
    };

    // チャンネルごとのミュート/通知の更新
    const saveChannelSelfSettings = (guildId, channelId, patch) => {
        if (!socket || !guildId || guildId === '@me') return;
        socket.timeout(15000).emit('updateSelfChannelSettings', { guildId, channelId, ...patch }, (err, result) => {
            if (!err && result?.ok) {
                setGuildSelfSettings((current) => {
                    const guild = current[guildId] || {};
                    const overrides = { ...(guild.channelOverrides || {}) };
                    const override = { ...(overrides[channelId] || {}) };
                    if (patch.mute !== undefined) override.muted = patch.mute !== false && patch.mute !== 0;
                    if (patch.messageNotifications !== undefined) override.messageNotifications = patch.messageNotifications;
                    overrides[channelId] = override;
                    return { ...current, [guildId]: { ...guild, channelOverrides: overrides } };
                });
            }
        });
    };

    const openChannelContextMenu = (event, channel) => {
        const payload = buildChannelContextMenu(event, channel, {
            guildId: paramGuildId,
            socket,
            canCreateInvite, canManageChannels,
            openInviteForChannel,
            openUserContextMenu,
            loadGuildSelfSettings,
            guildSelfSettings,
            saveChannelSelfSettings,
            setChannelModal,
            setChannelDeleteTarget,
            onOpenChannelSettings: (ch) => { setSettingsContext({ type: 'channel', channel: ch, guildId: paramGuildId }); setSettingsOpen(true); },
        });
        if (payload) setActionMenu(payload);
    };
    const requestCreateInvite = ({ maxAge, maxUses }) => {
        if (!inviteModal?.channelId) return;
        setInviteBusy(true);
        socket.timeout(15000).emit('createInvite', { channelId: inviteModal.channelId, maxAge, maxUses }, (err, result) => {
            setInviteBusy(false);
            if (err || !result?.ok) {
                setInviteError(result?.error || '招待を作成できませんでした');
                return;
            }
            setInvite(result.invite);
            setInviteError(null);
        });
    };

    const overlayProps = {
        socket,
        navigate,
        guildId: paramGuildId,
        channelId: paramChannelId,
        channels,
        channelDeleteTarget,
        friends,
        channelModal,
        channelModalBusy,
        channelModalError,
        serverModalOpen,
        serverModalBusy,
        serverModalError,
        joinModalOpen,
        joinModalBusy,
        joinModalError,
        groupModalOpen,
        groupModalBusy,
        groupModalError,
        addFriendModalOpen,
        addFriendModalBusy,
        addFriendModalError,
        addFriendModalSuccess,
        groupMemberTarget,
        groupMemberBusy,
        groupMemberError,
        inviteModal,
        inviteBusy,
        invite,
        inviteError,
        requestCreateInvite,
        actionMenu,
        activeModal,
        stickerPreview,
        stickerPreviewGuild,
        previewData,
        userPopout,
        mediaPicker,
        pickerStyle,
        guildEmojis,
        emojiGroups,
        guildStickers,
        replyingTo,
        setChannelModal,
        setChannelModalBusy,
        setChannelModalError,
        setChannels,
        setGuilds,
        setChannelDeleteTarget,
        setServerModalOpen,
        setServerModalBusy,
        setServerModalError,
        setJoinModalOpen,
        setJoinModalBusy,
        setJoinModalError,
        setGroupModalOpen,
        setGroupModalBusy,
        setGroupModalError,
        setAddFriendModalOpen,
        setAddFriendModalBusy,
        setAddFriendModalError,
        setAddFriendModalSuccess,
        setGroupMemberTarget,
        setGroupMemberBusy,
        setGroupMemberError,
        setInviteModal,
        setInvite,
        setInviteError,
        setActionMenu,
        setActiveModal,
        setStickerPreview,
        setPreviewData,
        setUserPopout,
        setMediaPicker,
        setReplyingTo,
        setFriends,
    };

    return (
        <div className="app-app" onClick={() => { setContextMenu(null); setUserPopout(null); setMediaPicker(null); setActionMenu(null); }}>
            <WindowHeader guild={currentGuildData} />
            <div className="app-layout" data-mobile-closing={isClosingMobileChat}>
                <div className={`flex shrink-0 ${showMobileChat && !isClosingMobileChat ? 'hidden md:flex' : 'flex'}`}>
                    <ServerList
                        guilds={guilds}
                        currentGuildId={paramGuildId}
                        user={user}
                        onSettings={() => { setSettingsContext({ type: 'user' }); setSettingsOpen(true); }}
                        onUserClick={(e) => {
                            openSelfMenu(e);
                        }}
                        onSelect={(gid) => navigate(`/${gid}`)}
                        onAddServer={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setActionMenu({
                                x: rect.right + 8,
                                y: rect.top,
                                items: [
                                    { id: 'create', label: 'サーバーを作成', onClick: () => setServerModalOpen(true) },
                                    { id: 'join', label: '招待で参加', onClick: () => setJoinModalOpen(true) },
                                ],
                            });
                        }}
                        canManageGuild={(guildId) => {
                            const perms = permissionsByGuild[guildId];
                            return can(perms, PERMISSION_BITS.MANAGE_GUILD)
                                || can(perms, PERMISSION_BITS.MANAGE_ROLES)
                                || can(perms, PERMISSION_BITS.MANAGE_CHANNELS)
                                || can(perms, PERMISSION_BITS.MANAGE_EXPRESSIONS)
                                || can(perms, PERMISSION_BITS.BAN_MEMBERS);
                        }}
                        canInvite={(guildId) => can(permissionsByGuild[guildId], PERMISSION_BITS.CREATE_INVITE)}
                        onGuildSettings={(guildId) => { setSettingsContext({ type: 'guild', guildId }); setSettingsOpen(true); }}
                        onGuildInvite={(guildId) => openInviteForGuild(guildId)}
                        guildSelfSettings={guildSelfSettings}
                        onGuildMenuOpen={(guildId) => loadGuildSelfSettings(guildId)}
                        onGuildMarkRead={(guildId) => socket.timeout(15000).emit('ackGuild', { guildId })}
                        onGuildMute={(guildId, seconds) => saveGuildSelfSettings(guildId, { mute: seconds })}
                        onGuildNotify={(guildId, value) => saveGuildSelfSettings(guildId, { messageNotifications: value })}
                        onGuildLeave={(guildId) => socket.timeout(20000).emit('leaveGuild', { guildId }, (err, result) => {
                            if (!err && result?.ok) navigate('/@me');
                        })}
                    />
                    <ChannelSidebar
                        currentGuild={currentGuildData}
                        channels={channels}
                        loading={loadingChannels}
                        currentChannelId={paramChannelId}
                        onSelectChannel={(ch) => navigate(`/${paramGuildId}/${ch.id}`)}
                        onSelectHome={() => navigate('/@me')}
                        onSelectFriends={() => navigate('/@me/friends')}
                        pendingCount={isDMView ? friends.filter((f) => f.relationshipType === 'pending_incoming').length : 0}
                        onCreateGroup={isDMView ? () => { setGroupModalOpen(true); setGroupModalError(null); } : null}
                        joinedVoiceChannelId={joinedVoiceChannelId}
                        onLeaveVoice={() => socket.emit('leave-voice')}
                        canManage={canManageGuildLike}
                        canManageChannels={canManageChannels}
                        canInvite={canCreateInvite}
                        onInviteChannel={(ch) => openInviteForChannel(ch)}
                        onEditChannel={(ch) => { setSettingsContext({ type: 'channel', channel: ch, guildId: paramGuildId }); setSettingsOpen(true); }}
                        onMarkRead={(channelId) => socket.emit('ackChannel', { channelId })}
                        onChannelContextMenu={openChannelContextMenu}
                        onCategoryContextMenu={(event, category) => {
                            event.preventDefault();
                            const isVirtual = !category.name && (category.id === 'uncategorized' || category.id === 'dms');
                            setActionMenu({
                                x: event.clientX,
                                y: event.clientY,
                                width: 224,
                                items: [
                                    { id: 'create-channel', label: 'チャンネルを作成', icon: <Symbol size={18}>library_add</Symbol>, onClick: () => setChannelModal({ mode: 'create', defaultParentId: isVirtual ? null : category.id }) },
                                    ...(!isDMView && !isVirtual && canManageChannels ? [
                                        { id: 'create-cat', label: 'カテゴリを作成', icon: <Symbol size={18}>library_add</Symbol>, onClick: () => setChannelModal({ mode: 'create', type: 'category' }) },
                                        { id: 'edit-cat', label: 'カテゴリ名を変更', icon: <Symbol size={18}>edit</Symbol>, onClick: () => setChannelModal({ mode: 'edit', channel: { id: category.id, name: category.name, type: 4 } }) },
                                        { id: 'delete-cat', label: 'カテゴリを削除', icon: <Symbol size={18}>delete</Symbol>, danger: true, onClick: () => setChannelDeleteTarget({ id: category.id, name: category.name, type: 4 }) },
                                        { type: 'divider' },
                                    ] : []),
                                    ...(!isVirtual ? [
                                        { id: 'copy-id', label: 'カテゴリIDをコピー', icon: <Symbol size={18}>badge</Symbol>, onClick: () => navigator.clipboard?.writeText(category.id) },
                                    ] : []),
                                ],
                            });
                        }}
                        onEmptyContextMenu={(event) => {
                            event.preventDefault();
                            if (!canManageChannels) return;
                            setActionMenu({
                                x: event.clientX,
                                y: event.clientY,
                                width: 224,
                                items: [
                                    { id: 'create-channel', label: 'チャンネルを作成', icon: <Symbol size={18}>library_add</Symbol>, onClick: () => setChannelModal({ mode: 'create' }) },
                                    { id: 'create-category', label: 'カテゴリを作成', icon: <Symbol size={18}>library_add</Symbol>, onClick: () => setChannelModal({ mode: 'create', type: 'category' }) },
                                ],
                            });
                        }}
                        onServerSettings={() => { if (canManageGuildLike) { setSettingsContext({ type: 'guild', guildId: paramGuildId }); setSettingsOpen(true); } }}
                    />
                </div>

                <div ref={contentShellRef} className={`app-content-shell ${showMobileChat ? 'flex' : 'hidden md:flex'}`}>
                    {isFriendsRoute ? (
                        friendsLoading ? <LoadingContent /> : (
                            <FriendsView
                                friends={friends}
                                onUserClick={openUserPopout}
                                onUserContextMenu={(event, targetUser) => openUserContextMenu(event, targetUser, null)}
                                onAddFriend={() => { setAddFriendModalOpen(true); setAddFriendModalError(null); setAddFriendModalSuccess(null); }}
                            />
                        )
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
                        {!isForum && (paramGuildId === '@me' && !paramChannelId ? (
                            <HomeView
                                onCreate={(event) => setActionMenu({
                                    x: event.clientX,
                                    y: event.clientY,
                                    width: 224,
                                    items: [
                                        { id: 'create-group', label: 'グループDMを作成', icon: <Symbol size={18}>group_add</Symbol>, onClick: () => { setGroupModalOpen(true); setGroupModalError(null); } },
                                        { id: 'create', label: 'サーバーを作成', icon: <Symbol size={18}>dns</Symbol>, onClick: () => setServerModalOpen(true) },
                                        { id: 'join', label: '招待で参加', icon: <Symbol size={18}>login</Symbol>, onClick: () => setJoinModalOpen(true) },
                                    ],
                                })}
                                onOpenSettings={() => { setSettingsContext({ type: 'user' }); setSettingsOpen(true); }}
                            />
                        ) : (
                        <main className="app-chat" data-thread-pane={parentForum ? 'true' : 'false'}>
                            <header className="app-chat-header">
                                <md-icon-button onClick={closeMobileChat} class="m3-icon-button md:hidden" title="戻る">
                                    <Symbol size={20}>arrow_back</Symbol>
                                </md-icon-button>
                                {currentChannel && <ChannelIcon type={currentChannel.type} />}
                                {currentChannel && (
                                    <div
                                        className="contents"
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            openChannelContextMenu(event, currentChannel);
                                        }}
                                    >
                                        <ChannelHeaderName name={currentChannel?.name || (paramGuildId === '@me' ? 'DM' : isDesktop ? currentGuildData?.name || 'サーバー' : 'チャンネルを選択')} />
                                    </div>
                                )}
                                {!currentChannel && (
                                    <ChannelHeaderName name={paramGuildId === '@me' ? 'DM' : isDesktop ? currentGuildData?.name || 'サーバー' : 'チャンネルを選択'} />
                                )}
                                {currentChannel?.topic && (
                                    <>
                                        <span className="app-header-divider" aria-hidden="true" />
                                        <span className="app-header-topic" title={currentChannel.topic}>{currentChannel.topic.split('\n')[0]}</span>
                                    </>
                                )}
                                {parentForum && (
                                    <md-icon-button class="m3-icon-button app-thread-close" title="スレッドを閉じる" onClick={() => navigate(`/${paramGuildId}/${parentForum.id}`)}>
                                        <Symbol size={20}>close</Symbol>
                                    </md-icon-button>
                                )}
                                <div className="hidden min-w-0 flex-1 sm:block" />
                                <div className="ml-auto flex items-center gap-1">
                                    {paramGuildId === '@me' && (currentChannel?.type === 'GROUP_DM' || currentChannel?.type === 3) && (
                                        <md-icon-button
                                            class="m3-icon-button"
                                            title="フレンドをグループに追加"
                                            onClick={() => { setGroupMemberTarget({ channel: currentChannel }); setGroupMemberError(null); }}
                                        >
                                            <Symbol size={20}>person_add</Symbol>
                                        </md-icon-button>
                                    )}
                                    {paramChannelId && (
                                        <md-icon-button
                                            class="m3-icon-button"
                                            title="ピン留め"
                                            data-active={rightPanel === 'pins'}
                                            onClick={() => setRightPanel((panel) => panel === 'pins' ? null : 'pins')}
                                        >
                                            <Symbol size={20}>keep</Symbol>
                                        </md-icon-button>
                                    )}
                                    {paramGuildId !== '@me' && (
                                        <md-icon-button
                                            class="m3-icon-button"
                                            title="メンバー"
                                            data-active={rightPanel === 'members'}
                                            onClick={() => setRightPanel((panel) => panel === 'members' ? null : 'members')}
                                        >
                                            <Symbol size={20}>group</Symbol>
                                        </md-icon-button>
                                    )}
                                    {currentChannel && !isDMView && canManageChannels && (
                                        <md-icon-button
                                            class="m3-icon-button"
                                            title="チャンネル設定"
                                            onClick={() => { setSettingsContext({ type: 'channel', channel: currentChannel, guildId: paramGuildId }); setSettingsOpen(true); }}
                                        >
                                            <Symbol size={17}>settings</Symbol>
                                        </md-icon-button>
                                    )}
                                    <div className="hidden items-center xl:flex">
                                        <input
                                            type="text"
                                            className="app-header-search"
                                            placeholder="メッセージを検索"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setSearchQuery(value);
                                                if (value) setRightPanel('search');
                                                else setRightPanel((panel) => panel === 'search' ? null : panel);
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center xl:hidden">
                                        <md-icon-button
                                            class="m3-icon-button"
                                            title="検索"
                                            data-active={rightPanel === 'search'}
                                            onClick={() => setRightPanel((panel) => panel === 'search' ? null : 'search')}
                                        >
                                            <Symbol size={20}>search</Symbol>
                                        </md-icon-button>
                                    </div>
                                </div>
                            </header>

                            {paramChannelId ? (
                                <>
                                  <div className="app-chat-body">
                                    <div className="app-chat-main">
                                    <div ref={scrollRef} onScroll={handleScroll} className="app-messages no-scrollbar" data-loading={isChannelLoading ? 'true' : 'false'} aria-busy={isChannelLoading}>
                                        {isChannelLoading ? <LoadingContent /> : <>
                                        <div className="flex select-none flex-col mx-4 mt-[18px] mb-2.5 text-[var(--app-on-surface)]">
                                            <h1 className="m-0 text-[32px] leading-[1.15] font-[650]">{currentChannel?.name || '会話'}</h1>
                                            <p className="mt-1.5 mb-0 text-[var(--app-on-surface-variant)] text-base font-medium">これが会話の始まりです。</p>
                                        </div>
                                        {loadingOlder && <div className="py-4 text-center text-xs text-[var(--app-outline)]">過去のメッセージを読み込み中...</div>}
                                        {messages.map((m, index) => (
                                            <MessageItem
                                                key={m.id}
                                                m={m}
                                                previousMessage={messages[index - 1]}
                                                user={user}
                                                usersById={usersById}
                                                guildRoles={guildRoles}
                                                channels={allFlattenedChannels}
                                                guildId={paramGuildId}
                                                channelId={paramChannelId}
                                                socket={socket}
                                                navigate={navigate}
                                                guilds={guilds}
                                                hovered={hoveredMessageId}
                                                setHovered={setHoveredMessageId}
                                                canManageMessages={canManageMessages}
                                                editingMessageId={editingMessageId}
                                                setEditingMessageId={setEditingMessageId}
                                                editInput={editInput}
                                                setEditInput={setEditInput}
                                                setContextMenu={setContextMenu}
                                                startReply={startReply}
                                                setMediaPicker={setMediaPicker}
                                                getPickerAnchor={getPickerAnchor}
                                                setEmojiGroups={setEmojiGroups}
                                                setMessages={setMessages}
                                                setActiveModal={setActiveModal}
                                                setPreviewData={setPreviewData}
                                                setStickerPreview={setStickerPreview}
                                                jumpToMessage={jumpToMessage}
                                                resolveReplyMessage={resolveReplyMessage}
                                                openUserPopout={openUserPopout}
                                                openUserContextMenu={openUserContextMenu}
                                            />
                                        ))}
                                        {uploadDraft && <DraftUploadMessage draft={uploadDraft} user={user} channels={allFlattenedChannels} roles={guildRoles} usersById={usersById} guildId={paramGuildId} navigate={navigate} guilds={guilds}
                                            onContextMenu={(event) => {
                                                event.preventDefault();
                                                if (uploadDraft.status === 'sending') return;
                                                setActionMenu({
                                                    x: event.clientX,
                                                    y: event.clientY,
                                                    width: 224,
                                                    items: [
                                                        ...(uploadDraft.content ? [{ id: 'copy-draft', label: 'テキストをコピー', icon: <Symbol size={18}>content_copy</Symbol>, onClick: () => navigator.clipboard?.writeText(uploadDraft.content) }] : []),
                                                        { type: 'divider' },
                                                        { id: 'delete-draft', label: 'メッセージを削除', icon: <Symbol size={18}>delete</Symbol>, danger: true, onClick: () => setUploadDraft(null) },
                                                    ],
                                                });
                                            }} />}
                                        <div ref={messagesEndRef} className="h-6 shrink-0" />
                                        </>}
                                    </div>
                                    {!atBottom && (
                                        <button type="button" className="app-jump-to-bottom" onClick={() => scrollToBottom(true)}>
                                            <span className="app-jump-text-grow">過去のメッセージを表示中</span>
                                            <span>最新へ移動</span>
                                            <Symbol size={16}>arrow_forward</Symbol>
                                        </button>
                                    )}
                                    <ChatInput
                                        channelName={currentChannel?.name}
                                        disabled={!paramChannelId}
                                        onTyping={() => {
                                            const now = Date.now();
                                            if (now - (typingEmitRef.current || 0) < 9000) return;
                                            typingEmitRef.current = now;
                                            socket.emit('sendTyping', { channelId: paramChannelId });
                                        }}
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
                                            socket.emit('getAllGuildEmojis', (groups) => setEmojiGroups(Array.isArray(groups) ? groups : []));
                                            setMediaPicker({ mode: 'emoji', purpose: 'insert', anchor: getPickerAnchor(e) });
                                        }}
                                        onDraftChange={setUploadDraft}
                                        mentionCandidates={mentionCandidates}
                                        slashCommands={slashCommands}
                                        onSlashCommand={(cmd) => {
                                            if (cmd.options?.length > 0) {
                                                setSlashError(null);
                                                setSlashCommand(cmd);
                                                return;
                                            }
                                            socket.timeout(45000).emit('sendSlashCommand', {
                                                channelId: paramChannelId,
                                                guildId: paramGuildId,
                                                commandId: cmd.id,
                                                commandName: cmd.name,
                                                applicationId: cmd.applicationId,
                                                version: cmd.version,
                                                options: []
                                            }, (err, result) => {
                                                if (err || result?.ok === false) return;
                                                setReplyingTo(null);
                                            });
                                        }}
                                        showSendButton={settings.showSendButton}
                                    />
                                    <SlashCommandModal
                                        key={slashCommand?.id || 'slash-none'}
                                        command={slashCommand}
                                        channels={allFlattenedChannels}
                                        roles={guildRoles}
                                        members={mentionCandidates}
                                        busy={slashBusy}
                                        error={slashError}
                                        onClose={() => { setSlashCommand(null); setSlashError(null); }}
                                        onSubmit={(options) => {
                                            setSlashBusy(true);
                                            setSlashError(null);
                                            socket.timeout(45000).emit('sendSlashCommand', {
                                                channelId: paramChannelId,
                                                guildId: paramGuildId,
                                                commandId: slashCommand.id,
                                                commandName: slashCommand.name,
                                                applicationId: slashCommand.applicationId,
                                                version: slashCommand.version,
                                                options
                                            }, (err, result) => {
                                                setSlashBusy(false);
                                                if (err || result?.ok === false) {
                                                    setSlashError(result?.error || 'コマンドを実行できませんでした');
                                                    return;
                                                }
                                                setSlashCommand(null);
                                                setReplyingTo(null);
                                            });
                                        }}
                                    />
                                    {Object.keys(typingUsers).length > 0 && (
                                        <div className="app-typing-indicator" aria-live="polite">
                                            <span className="app-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                                            <span className="min-w-0 truncate">
                                                {Object.values(typingUsers).slice(0, 3).map((t) => t.name).join(', ')}
                                                {Object.keys(typingUsers).length > 3 ? ' ほか' : ''} が入力中
                                            </span>
                                        </div>
                                    )}
                                    </div>
                                    {rightPanel === 'members' && paramGuildId !== '@me' && (
                                        <aside className="app-right-panel no-scrollbar">
                                            <MemberList
                                                members={guildMembers}
                                                guildRoles={guildRoles}
                                                loading={membersLoading}
                                                canModerate={canTimeout}
                                                onUserClick={(member, event) => {
                                                    const avatarEl = event.currentTarget;
                                                    const { left, right, top, bottom } = avatarEl.getBoundingClientRect();
                                                    setUserPopout({ anchor: { left, right, top, bottom }, userId: member.id, fallbackUser: member.user });
                                                }}
                                                onUserContextMenu={(member, event) => openUserContextMenu(event, member.user || member, member)}
                                            />
                                        </aside>
                                    )}
                                    {rightPanel === 'search' && (
                                        <aside className="app-right-panel no-scrollbar">
                                            <div className="app-pin-panel">
                                                {searching && <div className="py-4 text-center text-sm text-[var(--app-outline)]">検索中...</div>}
                                                {!searching && searchResults && (
                                                    <>
                                                        <span className="app-member-group-title">
                                                            {searchResults.error ? searchResults.error : `${searchResults.total} 件の結果 — 「${searchResults.query}」`}
                                                        </span>
                                                        <div className="app-search-results">
                                                            {searchResults.messages?.map((msg) => (
                                                                <button
                                                                    key={msg.id}
                                                                    type="button"
                                                                    className="app-pin-item"
                                                                    onClick={() => {
                                                                        navigate(`/${paramGuildId}/${msg.channelId}`);
                                                                        setTimeout(() => jumpToMessage(msg.id), 800);
                                                                    }}
                                                                >
                                                                    <span className="app-pin-item-head">
                                                                        {msg.author?.avatar && <img src={getProxyUrl(msg.author.avatar)} alt="" />}
                                                                        <strong>{msg.author?.displayName || msg.author?.username}</strong>
                                                                    </span>
                                                                    <span className="line-clamp-3 text-left text-[13px]">{msg.content || '(添付ファイル)'}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </aside>
                                    )}
                                    {rightPanel === 'pins' && paramChannelId && (
                                        <aside className="app-right-panel no-scrollbar">
                                            <div className="app-pin-panel">
                                                <span className="app-member-group-title">ピン留めされたメッセージ</span>
                                                {pinsLoading ? <div className="py-6 text-center text-sm text-[var(--app-outline)]">読み込み中...</div>
                                                    : pinnedMessages.length === 0 ? <div className="py-6 text-center text-sm text-[var(--app-outline)]">ピン留めはありません</div>
                                                        : pinnedMessages.map((msg) => (
                                                            <button key={msg.id} type="button" className="app-pin-item" onClick={() => jumpToMessage(msg.id)}>
                                                                <span className="app-pin-item-head">
                                                                    <img src={getProxyUrl(msg.author?.avatar)} alt="" />
                                                                    <strong>{msg.author?.displayName || msg.author?.username}</strong>
                                                                    <span>{formatTimestamp(msg.timestamp)}</span>
                                                                </span>
                                                                <MessageContent
                                                                    content={msg.content || ''}
                                                                    channels={allFlattenedChannels}
                                                                    guildRoles={guildRoles}
                                                                    guildId={paramGuildId}
                                                                    navigate={navigate}
                                                                    guilds={guilds}
                                                                />
                                                            </button>
                                                        ))}
                                            </div>
                                        </aside>
                                    )}
                                  </div>
                                </>
                            ) : (
                                loadingChannels ? (paramGuildId === '@me'
                                    ? <div className="app-workspace-progress" role="status" aria-label="ホームを読み込み中"><md-linear-progress indeterminate /></div>
                                    : <LoadingContent />) :
                                paramGuildId !== '@me' && !isDesktop ? <div className="flex-1" /> :
                                paramGuildId !== '@me' && isDesktop && hasReadableChannels ? <LoadingContent /> :
                                <div className="grid flex-1 place-items-center px-6 text-center">
                                    <div className="max-w-sm">
                                        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[var(--app-radius-xl)] bg-[var(--app-surface-container-high)] text-[var(--app-outline)]">
                                            <Symbol size={28}>tag</Symbol>
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
                        </main>
                        ))}
                        </>
                    )}
                </div>
            </div>

            {settingsOpen && (
                <AppSettings
                    open={settingsOpen}
                    context={settingsContext}
                    socket={socket}
                    user={user}
                    appSettings={settings}
                    onSettingsChange={updateSettings}
                    onReset={resetSettings}
                    onClose={() => setSettingsOpen(false)}
                    guilds={guilds}
                    guildRoles={guildRoles}
                    guildEmojis={guildEmojis}
                    channels={channels}
                    guildData={guildData}
                    myPermissions={myPermissions}
                    onRefresh={() => {
                        socket.emit('getChannels', paramGuildId, (data) => setChannels(Array.isArray(data) ? data : []));
                        socket.emit('getGuilds', setGuilds);
                        if (paramGuildId !== '@me') {
                            socket.emit('getGuildEmojis', paramGuildId, setGuildEmojis);
                            socket.emit('getGuildRoles', paramGuildId, setGuildRoles);
                            socket.timeout(15000).emit('getGuild', { guildId: paramGuildId }, (err, result) => {
                                if (!err && result?.ok) setGuildData(result.guild);
                            });
                        }
                    }}
                    onGuildUpdated={() => {
                        socket.emit('getGuilds', setGuilds);
                        if (paramGuildId !== '@me') {
                            navigate('/@me');
                        }
                    }}
                    onLogout={() => {
                        sessionStorage.removeItem('current-session');
                        socket?.disconnect();
                        window.location.assign('/login');
                    }}
                />
            )}

            <DiscordOverlays {...overlayProps} />
            <MessageContextMenu
                contextMenu={contextMenu}
                user={user}
                guildId={paramGuildId}
                channelId={paramChannelId}
                socket={socket}
                setContextMenu={setContextMenu}
                startReply={startReply}
                canManageMessages={canManageMessages}
                setEditingMessageId={setEditingMessageId}
                setEditInput={setEditInput}
                setMediaPicker={setMediaPicker}
                getPickerAnchor={getPickerAnchor}
                setEmojiGroups={setEmojiGroups}
            />
        </div>
    );
}
