const { accountCookieName, pendingCookieName } = require('../config');
const { consumeLimit, readCredentialCookie, parseAccountSlot } = require('../utils/helpers');
const { getDirectDisplayName, getUserAvatar } = require('../services/formatter');
const {
    BotClient,
    SelfClient,
    Partials,
    sessions,
    loginQueue,
    destroySession,
} = require('../services/session');
const channelsHandlers = require('./handlers/channels');
const guildsHandlers = require('./handlers/guilds');
const messagesHandlers = require('./handlers/messages');
const usersHandlers = require('./handlers/users');
const { saveRawMessage, attachClientEvents } = require('./discordEvents');
const baseHandlers = require('./baseHandlers');

const BASE_EVENTS = [
    'login',
    'getGuilds',
    'getChannels',
    'getFriends',
    'getGuildEmojis',
    'getAllGuildEmojis',
    'getGuildStickers',
    'getGuildRoles',
    'getMessages',
    'sendMessage',
    'getUserProfile',
    'getUserInfo',
    'addReaction',
    'removeReaction',
    'getSlashCommands',
    'sendSlashCommand',
    'interaction',
];

const connectionAttempts = new Map();

const setupSocket = (io) => {
    io.use((socket, next) => {
        const address = socket.handshake.address || 'unknown';
        if (!consumeLimit(connectionAttempts, address, 30, 60_000)) {
            return next(new Error('Too many connection attempts'));
        }
        return next();
    });

    const handlerModules = [
        channelsHandlers(io),
        guildsHandlers(io),
        messagesHandlers(io),
        usersHandlers(io),
    ];
    const handlerEvents = handlerModules.flatMap((module) => module.events);
    const allowedEvents = new Set([...BASE_EVENTS, ...handlerEvents]);
    const allowedEventSet = new Set(allowedEvents);
    const readEventSet = new Set(handlerEvents.filter((event) => event.startsWith('get')));
    const cheapMutationSet = new Set(['sendTyping']);

    io.on('connection', (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        const eventLimits = new Map();

        socket.use(([event], next) => {
            // 未知イベントは接続を切らずに破棄する(接続切断は再接続ループを引き起こす)
            if (!allowedEventSet.has(event)) {
                console.warn(`[Socket] ${socket.id}: dropped unknown event '${event}'`);
                return next();
            }
            const isLogin = event === 'login';
            const isMutation = !isLogin && !readEventSet.has(event) && event !== 'getMessages';
            const isExpensiveRead = [
                'getUserProfile',
                'getUserInfo',
                'getSlashCommands',
                'getGuildAuditLogs',
            ].includes(event);
            const isTyping = event === 'sendTyping';
            let limit;
            let windowMs;
            if (isLogin) {
                limit = 5;
                windowMs = 60_000;
            } else if (isTyping) {
                limit = 8;
                windowMs = 10_000;
            } else if (isExpensiveRead) {
                limit = 20;
                windowMs = 60_000;
            } else if (event === 'getMessages') {
                limit = 60;
                windowMs = 60_000;
            } else if (isMutation && !cheapMutationSet.has(event)) {
                limit = 30;
                windowMs = 10_000;
            } else {
                limit = 120;
                windowMs = 60_000;
            }
            if (!consumeLimit(eventLimits, event, limit, windowMs))
                return next(new Error('Rate limited'));
            return next();
        });

        handlerModules.forEach((module) => module.register(socket));

        socket.on('error', (error) => console.warn(`[Socket] ${socket.id}: ${error.message}`));

        socket.on('login', async (credentials = {}) => {
            if (sessions.has(socket.id)) {
                const existingClient = sessions.get(socket.id);
                if (existingClient?.user) {
                    return socket.emit('login-success', {
                        isBot: !!existingClient.user.bot,
                        user: {
                            id: existingClient.user.id,
                            username: existingClient.user.username,
                            displayName: getDirectDisplayName(existingClient.user),
                            globalName: existingClient.user.globalName || existingClient.user.displayName,
                            avatar: getUserAvatar(existingClient.user, { format: 'png' }),
                        },
                    });
                }
                return;
            }
            if (loginQueue.has(socket.id)) return;

            const slot = parseAccountSlot(credentials.slot);
            const cookieName =
                credentials.pending === true
                    ? pendingCookieName
                    : slot === null
                        ? null
                        : accountCookieName(slot);
            const credential = cookieName
                ? readCredentialCookie(socket.handshake.headers.cookie, cookieName)
                : null;
            if (!credential) {
                console.warn(
                    `[Auth] Login rejected: no credential cookie (slot=${slot}, pending=${credentials.pending === true})`,
                );
                return socket.emit('login-error', 'Invalid credentials');
            }
            const { token, isBot } = credential;

            loginQueue.add(socket.id);
            console.log(`[Auth] Login attempt: ${isBot ? 'Bot' : 'User'}`);

            let client;
            if (isBot && BotClient) {
                // intents: Guilds/Members/Moderation/Emojis/Invites/Voice/Messages/Reactions/Typing/DM/Content
                client = new BotClient({
                    intents: [1, 2, 4, 8, 64, 128, 512, 1024, 2048, 4096, 8192, 16384, 32768],
                    partials: [
                        Partials.Message,
                        Partials.Channel,
                        Partials.Reaction,
                        Partials.GuildMember,
                        Partials.User,
                    ],
                });
            } else {
                client = new SelfClient({ checkUpdate: false });
            }

            if (typeof client.on === 'function') {
                client.on('error', (error) =>
                    console.warn(`[Discord] client error: ${error?.message || error}`),
                );
                client.on('raw', (packet) => {
                    if (!packet || typeof packet !== 'object') return;
                    if (packet.t === 'MESSAGE_CREATE' || packet.t === 'MESSAGE_UPDATE') {
                        if (packet.d?.id) {
                            saveRawMessage(client, packet.d.id, packet.d);
                        }
                    }
                });
            }

            attachClientEvents(socket, client);

            try {
                await client.login(token);
            } catch (e) {
                loginQueue.delete(socket.id);
                console.warn(`[Auth] Login failed: ${e.message}`);
                socket.emit('login-error', 'Login failed');
                try {
                    client.destroy();
                } catch {}
            }
        });
        socket.on('disconnect', () => {
            destroySession(socket.id);
        });
        baseHandlers.register(socket);
    });
};

module.exports = { setupSocket };
