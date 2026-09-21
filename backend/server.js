require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const { corsOptions, isAllowedOrigin } = require('./src/config');
const authRouter = require('./src/routes/auth');
const proxyRouter = require('./src/routes/proxy');
const { setupSocket } = require('./src/socket');

const app = express();
app.disable('x-powered-by');

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'none'"],
            imgSrc: ["'self'", 'data:'],
            frameAncestors: ["'none'"],
            baseUri: ["'none'"],
        }
    }
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '4kb' }));

app.use('/api/auth', authRouter);
app.use('/api/image-proxy', proxyRouter);

const server = http.createServer(app);
const io = new Server(server, {
    cors: corsOptions,
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
    maxHttpBufferSize: 30 * 1024 * 1024,
    perMessageDeflate: false,
    serveClient: false
});

setupSocket(io);

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`[System] Backend listening on port ${PORT}`));
