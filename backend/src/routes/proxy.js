const express = require('express');
const dns = require('dns').promises;
const { rateLimit } = require('express-rate-limit');
const {
    IMAGE_PROXY_HOSTS,
    MAX_PROXY_BYTES,
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_CACHE_BYTES
} = require('../config');
const { isPrivateAddress } = require('../utils/helpers');

const router = express.Router();

const imageProxyLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10_000,
    standardHeaders: 'draft-8',
    legacyHeaders: false
});

const imageCache = new Map();
const imageRequests = new Map();
let imageCacheBytes = 0;
let activeImageFetches = 0;
let cdnCooldownUntil = 0;
const imageFetchQueue = [];

const cacheImage = (key, image) => {
    if (imageCache.has(key)) imageCacheBytes -= imageCache.get(key).body.length;
    imageCache.delete(key);
    imageCache.set(key, image);
    imageCacheBytes += image.body.length;
    while (imageCacheBytes > MAX_IMAGE_CACHE_BYTES) {
        const oldest = imageCache.keys().next().value;
        imageCacheBytes -= imageCache.get(oldest).body.length;
        imageCache.delete(oldest);
    }
};

const runImageQueue = () => {
    while (activeImageFetches < 4 && imageFetchQueue.length) {
        const task = imageFetchQueue.shift();
        activeImageFetches++;
        task().finally(() => { activeImageFetches--; runImageQueue(); });
    }
};

const queuedImage = (key, load) => {
    if (imageRequests.has(key)) return imageRequests.get(key);
    const promise = new Promise((resolve, reject) => {
        if (imageFetchQueue.length >= 200) return reject(new Error('queue_full'));
        imageFetchQueue.push(() => load().then(resolve, reject));
        runImageQueue();
    });
    imageRequests.set(key, promise);
    promise.finally(() => imageRequests.delete(key)).catch(() => {});
    return promise;
};

const validateProxyUrl = async (value) => {
    if (typeof value !== 'string' || value.length > 2048) throw new Error('invalid_url');
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('invalid_url');
    if (!IMAGE_PROXY_HOSTS.has(url.hostname.toLowerCase())) throw new Error('host_not_allowed');
    const addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error('unsafe_address');
    return url;
};

router.get('/', imageProxyLimiter, async (req, res) => {
    try {
        const imageUrl = await validateProxyUrl(req.query.url);
        const key = imageUrl.href;
        let image = imageCache.get(key);
        if (image) {
            imageCache.delete(key);
            imageCache.set(key, image);
        } else {
            image = await queuedImage(key, async () => {
                if (Date.now() < cdnCooldownUntil) throw new Error('cdn_rate_limited');
                const response = await fetch(imageUrl, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
                if (response.status === 429) {
                    const retryAfter = Number(response.headers.get('retry-after'));
                    cdnCooldownUntil = Date.now() + (Number.isFinite(retryAfter) && retryAfter > 0
                        ? Math.min(retryAfter * 1000, 60_000) : 10_000);
                    await response.body?.cancel();
                    throw new Error('cdn_rate_limited');
                }
                const contentType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
                const declaredSize = Number(response.headers.get('content-length') || 0);
                if (!response.ok || !ALLOWED_IMAGE_TYPES.has(contentType) || declaredSize > MAX_PROXY_BYTES || !response.body) {
                    await response.body?.cancel();
                    throw new Error('invalid_image');
                }
                const reader = response.body.getReader();
                const chunks = [];
                let size = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    size += value.byteLength;
                    if (size > MAX_PROXY_BYTES) {
                        await reader.cancel();
                        throw new Error('image_too_large');
                    }
                    chunks.push(Buffer.from(value));
                }
                const result = { contentType, body: Buffer.concat(chunks, size) };
                cacheImage(key, result);
                return result;
            });
        }
        res.setHeader('Content-Type', image.contentType);
        res.setHeader('Content-Length', String(image.body.length));
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(image.body);
    } catch (error) {
        const status = ['invalid_url', 'host_not_allowed', 'unsafe_address'].includes(error.message) ? 400
            : error.message === 'image_too_large' ? 413
            : error.message === 'cdn_rate_limited' || error.message === 'queue_full' ? 503 : 502;
        if (status === 503) res.setHeader('Retry-After', String(Math.max(1, Math.ceil((cdnCooldownUntil - Date.now()) / 1000))));
        return res.status(status).json({ error: status === 400 ? 'Invalid image URL' : 'Image could not be fetched' });
    }
});

module.exports = router;
