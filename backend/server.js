require('dotenv').config();
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { cors } = require('hono/cors');
const { secureHeaders } = require('hono/secure-headers');
const { Server } = require('socket.io');

const { corsOptions, isAllowedOrigin } = require('./src/config');
const authApp = require('./src/routes/auth');
const proxyApp = require('./src/routes/proxy');
const { setupSocket } = require('./src/socket');

const app = new Hono();

app.use(secureHeaders({
    crossOriginResourcePolicy: 'cross-origin',
    contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
    }
}));

app.use(cors({
    origin: (origin) => (origin && isAllowedOrigin(origin) ? origin : undefined),
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
    maxAge: 86400
}));

app.route('/api/auth', authApp);
app.route('/api/image-proxy', proxyApp);

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((err, c) => {
    console.error('[HTTP]', err);
    return c.json({ error: 'Internal server error' }, 500);
});

const PORT = Number(process.env.PORT || 8000);
const server = serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`[System] Backend listening on port ${PORT}`);
});

const io = new Server(server, {
    cors: corsOptions,
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
    maxHttpBufferSize: 30 * 1024 * 1024,
    perMessageDeflate: false,
    serveClient: false
});

setupSocket(io);
