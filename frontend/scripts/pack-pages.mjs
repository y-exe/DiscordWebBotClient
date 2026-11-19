// OpenNext (Cloudflare Workers) の出力を Cloudflare Pages (advanced mode) 用に梱包する。
// dist/_worker.js/ にワーカーモジュール一式、dist/ 直下に静的アセットを展開する。
//
// Next 16 の CJS モジュール (dev/browser-logs/file-logger.js など) がバンドル内に
// 生の require を残すため、エントリの先頭で globalThis.require を用意する。
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

// require シムを最優先で読み込むラッパーエントリ
// (Pages advanced mode は worker 優先のため、静的アセットは env.ASSETS から配信する)
writeFileSync(
  path.join(workerDir, 'shim.mjs'),
  "import { createRequire } from 'node:module';\n\nif (typeof globalThis.require === 'undefined') {\n  globalThis.require = createRequire('file:///worker/shim.mjs');\n}\n",
);
writeFileSync(
  path.join(workerDir, 'index.js'),
  [
    "import './shim.mjs';",
    "import worker from './worker.js';",
    '',
    'const API_PREFIXES = ["/api/", "/socket.io/"];',
    '',
    'export default {',
    '  async fetch(request, env, ctx) {',
    '    const url = new URL(request.url);',
    '    const isApi = url.pathname === "/healthz" || API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));',
    "    if (!isApi && (request.method === 'GET' || request.method === 'HEAD') && env.ASSETS) {",
    '      const asset = await env.ASSETS.fetch(request);',
    '      if (asset && asset.status !== 404) return asset;',
    '    }',
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
