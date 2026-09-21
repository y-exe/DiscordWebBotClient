import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Head from '../seo/Head';

const sections = [
  {
    title: '1. はじめに',
    content: 'Discord Web Token Client（以下「本プロジェクト」）は、個人の学習およびフィルタリング回避の補助を目的としたオープンソースプロジェクトです。利用者は、本規約に同意した上で本サービスを利用するものとします。'
  },
  {
    title: '2. 自己責任の原則',
    content: '本サービスでユーザー名義のトークン（Self-bot）を使用することは、Discord公式のサービス利用規約（ToS）に違反する可能性があります。本サービスの利用によりアカウントが停止、削除、または制限された場合でも、開発者は一切の責任を負いません。すべて利用者の自己責任において利用してください。'
  },
  {
    title: '3. 禁止事項',
    items: [
      'スパム、嫌がらせ、またはDiscordサーバーの運営を妨害する行為。',
      '自動化されたスクリプト等による過度な負荷をかける行為。',
      '他人のトークンを不正に取得・使用する行為。'
    ]
  },
  {
    title: '4. 免責事項',
    content: '開発者は本サービスの正確性、完全性、安全性を保証しません。本サービスの利用に関連して生じた直接的・間接的な損害について、一切の責任を負いません。'
  }
];

export default function Terms() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Head
        title="利用規約"
        description="Discord Web Token Clientの利用規約です。本サービスの利用に関するルールや免責事項についてご確認いただけます。"
        path="/terms"
      />
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 sm:px-10 sm:pt-24">
        <Link to="/login" className="text-sm text-white/70 underline underline-offset-4 transition-colors hover:text-white">← ログインに戻る</Link>
        <h1 className="mt-16 text-4xl font-bold tracking-tight sm:text-5xl">利用規約</h1>
        <div className="mt-16 space-y-12 border-t border-white/25 pt-12 leading-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-4 text-xl font-semibold">{section.title}</h2>
              {section.content && <p className="text-white/85">{section.content}</p>}
              {section.items && (
                <ul className="list-disc space-y-2 pl-6 text-white/85">
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>
        <footer className="mt-20 border-t border-white/25 pt-6 text-sm text-white/60">© {new Date().getFullYear()} yexe</footer>
      </main>
    </div>
  );
}
