/**
 * materialcord 通信プロキシ: papi.yexe.xyz (backend) を隠蔽するエッジ。
 * C:\Code\proxy の webproxy と同じ構造 (HTTP + WebSocket パススルー)。
 */

export const HOP_BY_HOP_HEADERS = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
]);

const PROXIED_PREFIXES = ['/api/', '/socket.io/'];
const PROXIED_PATHS = ['/healthz'];

/**
 * プロキシ対象ルートか判定する
 */
function isBackendRoute(pathname) {
    return PROXIED_PATHS.includes(pathname) || PROXIED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * アクセス元オリジンが許可されているか (本番 + Pages プレビュー)
 */
function isAllowedOrigin(origin, env) {
    if (!origin) return false;
    if (env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) return true;
    if (env.ALLOWED_ORIGIN_PATTERN) {
        try {
            return new URL(origin).hostname === env.ALLOWED_ORIGIN_PATTERN
                || new URL(origin).hostname.endsWith(`.${env.ALLOWED_ORIGIN_PATTERN}`);
        } catch {
            return false;
        }
    }
    return false;
}

function copyRequestHeaders(request, incomingUrl, upstreamUrl, isWebSocket) {
    const headers = new Headers(request.headers);

    for (const header of HOP_BY_HOP_HEADERS) {
        if (isWebSocket && (header === 'connection' || header === 'upgrade')) continue;
        headers.delete(header);
    }

    headers.delete('host');
    headers.set('x-forwarded-host', incomingUrl.host);
    headers.set('x-forwarded-proto', incomingUrl.protocol.slice(0, -1));
    headers.set('x-forwarded-prefix', '');
    headers.set('x-worker-origin', incomingUrl.origin);
    headers.set('x-upstream-origin', upstreamUrl.origin);

    return headers;
}

function toUpstreamUrl(requestUrl, origin) {
    const upstreamBase = new URL(origin);
    const requestPath = requestUrl.pathname.startsWith('/') ? requestUrl.pathname : `/${requestUrl.pathname}`;
    const upstreamUrl = new URL(`${requestPath}${requestUrl.search}`, upstreamBase);
    upstreamUrl.hash = '';
    return upstreamUrl;
}

function rewriteLocation(location, upstreamOrigin, publicOrigin) {
    if (!location) return null;

    try {
        const parsed = new URL(location, upstreamOrigin);
        if (parsed.origin === upstreamOrigin) {
            return new URL(parsed.pathname + parsed.search + parsed.hash, publicOrigin).toString();
        }
    } catch {
        return location;
    }

    return location;
}

function copyResponseHeaders(response, upstreamOrigin, publicOrigin, requestOrigin, env) {
    const headers = new Headers(response.headers);
    const location = rewriteLocation(headers.get('location'), upstreamOrigin, publicOrigin);

    if (location) headers.set('location', location);
    headers.delete('server');
    headers.delete('x-powered-by');
    headers.set('x-proxy-edge', 'materialcord');

    if (isAllowedOrigin(requestOrigin, env)) {
        headers.set('access-control-allow-origin', requestOrigin);
        headers.set('access-control-allow-credentials', 'true');
        headers.append('vary', 'Origin');
    }

    return headers;
}

function corsPreflight(request, env) {
    const requestOrigin = request.headers.get('origin');
    if (!isAllowedOrigin(requestOrigin, env)) return null;

    return new Response(null, {
        status: 204,
        headers: {
            'access-control-allow-origin': requestOrigin,
            'access-control-allow-credentials': 'true',
            'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
            'access-control-allow-headers': request.headers.get('access-control-request-headers') || 'content-type',
            vary: 'Origin',
        },
    });
}

export default {
    async fetch(request, env) {
        if (!env.VPS_ORIGIN) {
            return new Response('VPS_ORIGIN is not configured.', { status: 500 });
        }

        const incomingUrl = new URL(request.url);
        if (!isBackendRoute(incomingUrl.pathname)) {
            return new Response('Worker only proxies backend routes.', { status: 404 });
        }

        if (request.method === 'OPTIONS') {
            const preflight = corsPreflight(request, env);
            if (preflight) return preflight;
        }

        const upstreamUrl = toUpstreamUrl(incomingUrl, env.VPS_ORIGIN);
        const isWebSocket = request.headers.get('upgrade')?.toLowerCase() === 'websocket';
        const headers = copyRequestHeaders(request, incomingUrl, upstreamUrl, isWebSocket);

        const upstreamRequest = new Request(upstreamUrl.toString(), {
            method: request.method,
            headers,
            body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
            redirect: 'manual',
        });

        const response = await fetch(upstreamRequest);
        if (isWebSocket) return response;

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: copyResponseHeaders(
                response,
                new URL(env.VPS_ORIGIN).origin,
                incomingUrl.origin,
                request.headers.get('origin'),
                env,
            ),
        });
    },
};
