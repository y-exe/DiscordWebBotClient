// OpenNext (Cloudflare Workers) の出力を Cloudflare Pages (advanced mode) 用に梱包する。
// dist/_worker.js/ にワーカーモジュール一式、dist/ 直下に静的アセットを展開する。
//
// ラッパーエントリ (index.js) は:
// - /api/* と /socket.io/* を upstream (backend) へプロキシ (クッキーをファーストパーティ化)
// - 静的アセットは env.ASSETS から配信
// - それ以外は OpenNext ワーカー (SSR)
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const openNextDir = path.join(root, '.open-next');
const distDir = path.join(root, 'dist');
const workerDir = path.join(distDir, '_worker.js');

if (!existsSync(path.join(openNextDir, 'worker.js'))) {
  console.error('.open-next/worker.js がありません。先に `opennextjs-cloudflare build` を実行してください。');
  process.exit(1);
}

rmSync(distDir, { recursive: true, force: true });
mkdirSync(workerDir, { recursive: true });

// ワーカーモジュール一式 (worker.js は opennext のエントリとして保持)
for (const entry of ['.build', 'cache', 'cloudflare', 'middleware', 'server-functions', 'worker.js']) {
  const source = path.join(openNextDir, entry);
  if (!existsSync(source)) continue;
  cpSync(source, path.join(workerDir, entry), { recursive: true });
}

// require シム + APIプロキシ + アセット配信ラッパー
writeFileSync(
  path.join(workerDir, 'shim.mjs'),
  [
    "import { createRequire } from 'node:module';",
    '',
    "if (typeof globalThis.require === 'undefined') {",
    "  globalThis.require = createRequire('file:///worker/shim.mjs');",
    '}',
    '',
  ].join('\n'),
);

writeFileSync(
  path.join(workerDir, 'index.js'),
  [
    "import './shim.mjs';",
    "import worker from './worker.js';",
    '',
    "const API_PREFIXES = ['/api/', '/socket.io/'];",
    "const HOP_BY_HOP_HEADERS = new Set(['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade']);",
    '',
    'function isApiPath(pathname) {',
    "  return pathname === '/healthz' || API_PREFIXES.some((prefix) => pathname.startsWith(prefix));",
    '}',
    '',
    'function toUpstreamRequest(request, upstreamOrigin) {',
    '  const incomingUrl = new URL(request.url);',
    '  const isWebSocket = request.headers.get("upgrade")?.toLowerCase() === "websocket";',
    '  const headers = new Headers(request.headers);',
    '  for (const header of HOP_BY_HOP_HEADERS) {',
    '    if (isWebSocket && (header === "connection" || header === "upgrade")) continue;',
    '    headers.delete(header);',
    '  }',
    '  headers.delete("host");',
    '  headers.set("x-forwarded-host", incomingUrl.host);',
    '  headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));',
    '  const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, upstreamOrigin);',
    '  return {',
    '    upstreamRequest: new Request(upstreamUrl.toString(), {',
    '      method: request.method,',
    '      headers,',
    '      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,',
    '      redirect: "manual",',
    '    }),',
    '    isWebSocket,',
    '  };',
    '}',
    '',
    'export default {',
    '  async fetch(request, env, ctx) {',
    '    const url = new URL(request.url);',
    '',
    '    // backend プロキシ (クッキーを ycord.pages.dev のファーストパーティとして保持)',
    '    if (isApiPath(url.pathname)) {',
    '      const upstreamOrigin = env.UPSTREAM_ORIGIN;',
    '      if (!upstreamOrigin) return new Response("UPSTREAM_ORIGIN is not configured.", { status: 500 });',
    '      const { upstreamRequest, isWebSocket } = toUpstreamRequest(request, upstreamOrigin);',
    '      const response = await fetch(upstreamRequest);',
    '      if (isWebSocket) return response;',
    '      const headers = new Headers(response.headers);',
    '      headers.delete("server");',
    '      headers.delete("x-powered-by");',
    '      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });',
    '    }',
    '',
    '    // 静的アセット (Pages のアセットマニフェストから配信)',
    "    if ((request.method === 'GET' || request.method === 'HEAD') && env.ASSETS) {",
    '      const asset = await env.ASSETS.fetch(request);',
    '      if (asset && asset.status !== 404) return asset;',
    '    }',
    '',
    '    // SSR / 動的ルート',
    '    return worker.fetch(request, env, ctx);',
    '  },',
    '};',
    "export * from './worker.js';",
    '',
  ].join('\n'),
);

// 静的アセット (_headers を含む) は dist 直下
cpSync(path.join(openNextDir, 'assets'), distDir, { recursive: true });

console.log('Pages 用出力を dist/ に生成しました。');
