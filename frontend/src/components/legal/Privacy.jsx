import { useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import Header from '../auth/Header';
import Footer from '../auth/Footer';
import MouseEffectCard from '../ui/MouseEffectCard';
import Head from '../seo/Head';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 20 } } };

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-google transition-colors duration-300 relative selection:bg-indigo-500/30">
      <Head 
        title="プライバシーポリシー" 
        description="Discord Web Token Clientにおける個人情報やトークンの取り扱いに関するポリシーです。安全な利用環境への取り組みについて説明しています。"
        path="/privacy"
      />
      <Header />
      
      <div className="flex-grow flex flex-col relative">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <MouseEffectCard className="w-full h-full bg-transparent border-none rounded-none" />
        </div>
        
        <main className="container mx-auto max-w-4xl py-32 px-6 flex-grow relative z-10">
          <Motion.div initial="hidden" animate="visible" variants={containerVariants}>
            <Motion.h1 variants={itemVariants} className="text-4xl md:text-5xl font-extrabold mb-12 tracking-tight text-gray-900 dark:text-white">プライバシーポリシー</Motion.h1>
            
            <div className="space-y-12 text-gray-600 dark:text-gray-300 leading-relaxed font-google">
              <Motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>1. トークンの取り扱い
                </h2>
                <p>入力されたDiscordトークンは、サーバーを介してDiscord公式APIとのリアルタイム通信のみに使用されます。当サーバー側のDBやファイルにトークンが永続的に保存されることはなく、接続終了時にサーバーのメモリから破棄されます。</p>
              </Motion.section>

              <Motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>2. ログイン履歴（Cookie）
                </h2>
                <p>利便性の向上のため、ログインに成功したアカウントのトークンをJavaScriptから読み取れないHttpOnly Cookieとしてブラウザに保存します。ユーザー名、ID、アバターなどの表示情報はlocalStorageに保存します。トークンはバックエンドのDBやファイルには保存されません。</p>
              </Motion.section>

              <Motion.section variants={itemVariants}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>3. ログの収集
                </h2>
                <p>サーバーでは、セキュリティ維持およびトラブルシューティングを目的に、アクセス日時やエラーログを最小限記録する場合があります。ただし、チャットメッセージの内容やプライベートな情報を収集・閲覧することはありません。</p>
              </Motion.section>
            </div>
          </Motion.div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
