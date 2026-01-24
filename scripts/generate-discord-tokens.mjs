// Discord Web クライアントの公開CSSからデザイントークン(色・形状・タイポグラフィ・4テーマ)を抽出し、
// frontend/src/styles/discord-tokens.css を生成する。
// 実行: bun scripts/generate-discord-tokens.mjs
// 出力は自動生成物。手動編集しないこと(再生成で上書きされる)。

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const PAGE_URL = 'https://discord.com/login';
const OUTPUT = path.resolve(import.meta.dirname, '../frontend/src/styles/discord-tokens.css');

const countVars = (body) => (body.match(/--[\w-]+(?=:)/g) || []).length;

// ミニファイ済みCSSをトップレベルブロック(selector, body)に分解する
const parseTopLevelBlocks = (css) => {
    const blocks = [];
    let depth = 0;
    let start = 0;
    let selector = '';
    let bodyStart = 0;
    for (let i = 0; i < css.length; i += 1) {
        const c = css[i];
        if (c === '{') {
            if (depth === 0) {
                selector = css.slice(start, i).trim();
                bodyStart = i + 1;
            }
            depth += 1;
        } else if (c === '}') {
            depth -= 1;
            if (depth === 0) {
                blocks.push({ selector, body: css.slice(bodyStart, i) });
                start = i + 1;
            }
        }
    }
    return blocks;
};

const has = (body, token) => body.includes(token);

// シグネチャでトークン定義ブロックを選ぶ(class名や並び順の変化に強くするため)
const pickBlocks = (blocks) => {
    const roots = blocks.filter((b) => b.selector === ':root' && countVars(b.body) >= 5);
    const themes = blocks.filter(
        (b) => /^\.theme-(dark|light|midnight|darker)$/.test(b.selector) && countVars(b.body) >= 500
    );
    const required = ['.theme-dark', '.theme-light', '.theme-midnight', '.theme-darker'];
    const found = new Set(themes.map((t) => t.selector));
    for (const name of required) {
        if (!found.has(name)) throw new Error(`theme block missing: ${name}`);
    }
    const select = (signature) => {
        const hit = roots.find((b) => has(b.body, signature));
        if (!hit) throw new Error(`root block with ${signature} not found`);
        return hit;
    };
    return {
        palette: roots.find((b) => countVars(b.body) >= 2000),
        extendedColors: select('--bg-gradient-'),
        metrics: select('--guildbar-avatar-size'),
        sizes: select('--breakpoint-xxl'),
        radius: select('--radius-round'),
        fonts: select('--font-primary'),
        fontWeights: select('--font-weight-black'),
        themes,
    };
};

const prettyPrint = (selector, body, indent = '    ') => {
    const decls = body.split(';').filter(Boolean);
    const lines = decls.map((d) => `${indent}${d.trim()};`);
    return `${selector} {\n${lines.join('\n')}\n}`;
};

const main = async () => {
    const page = await (await fetch(PAGE_URL, { headers: { 'user-agent': UA } })).text();
    const cssPaths = [...new Set(page.match(/\/assets\/\d+\.[a-f0-9]+\.css/g) || [])];
    if (cssPaths.length === 0) throw new Error('no css assets found on the page');

    let bundle = null;
    for (const p of cssPaths) {
        const css = await (await fetch(`https://discord.com${p}`, { headers: { 'user-agent': UA } })).text();
        if (css.includes('--guildbar-avatar-size') && css.includes('.theme-dark')) {
            bundle = { css, url: `https://discord.com${p}` };
            break;
        }
    }
    if (!bundle) throw new Error('token bundle css not found');

    const picks = pickBlocks(parseTopLevelBlocks(bundle.css));
    const parts = [
        `/* Discord Web クライアント (discord.com) のデザイントークン。`,
        `   生成元: ${bundle.url}`,
        `   生成: scripts/generate-discord-tokens.mjs による自動生成物。手動編集しない。 */`,
        '',
    ];
    const section = (title, blocks2) => {
        parts.push(`/* ===== ${title} ===== */`);
        for (const { selector, body } of blocks2) parts.push(prettyPrint(selector, body), '');
    };
    section('パレット (全カラースケール)', [picks.palette]);
    section('拡張カラー (グラデーション・ロール色等)', [picks.extendedColors]);
    section('寸法・形状', [picks.metrics, picks.sizes, picks.radius]);
    section('タイポグラフィ', [picks.fonts, picks.fontWeights]);
    section('テーマ (セマンティックトークン)', picks.themes);

    const out = parts.join('\n');
    await mkdir(path.dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, out, 'utf8');
    console.log(`written: ${OUTPUT} (${(out.length / 1024).toFixed(0)} KB, ${cssPaths.length} css assets scanned)`);
};

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
