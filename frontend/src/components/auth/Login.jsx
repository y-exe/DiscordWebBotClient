'use client';
import { useEffect, useState } from 'react';
import { motion as Motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import MouseEffectCard from '../ui/MouseEffectCard';
import { InteractiveHoverButton } from '../ui/InteractiveHoverButton';
import { FaUser, FaRobot, FaDiscord, FaTrash, FaQuestionCircle, FaTimes, FaHistory } from 'react-icons/fa';
import Header from './Header';
import Footer from './Footer';
import { NativeDelete } from '../ui/NativeDelete';
import {
  chooseAccountSlot,
  deleteAllStoredAccounts,
  deleteStoredAccount,
  loadAccountHistory,
  migrateLegacyAccounts,
  saveAccountHistory,
  stagePendingLogin,
} from '../../utils/tokenVault';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.085, delayChildren: 0.12 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};
const reducedItemVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } }
};

export default function Login() {
  const reduceMotion = useReducedMotion();
  const entranceVariants = reduceMotion ? reducedItemVariants : itemVariants;
  const [userToken, setUserToken] = useState("");
  const [botToken, setBotToken] = useState("");
  const [history, setHistory] = useState([]);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initial = loadAccountHistory();
    console.log('[Login] Loaded initial history count:', initial.length, initial);
    if (initial.length > 0) {
      setHistory(initial);
    }

    migrateLegacyAccounts()
      .then((migratedHistory) => {
        console.log('[Login] Migrated history count:', migratedHistory?.length, migratedHistory);
        if (!cancelled && Array.isArray(migratedHistory) && migratedHistory.length > 0) {
          setHistory(migratedHistory);
        }
      })
      .catch((error) => {
        console.error('Could not migrate the legacy login history:', error);
        if (!cancelled) {
          setHistory(loadAccountHistory());
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async (token, isBot) => {
    const cleanToken = token.trim();
    if (!cleanToken || isSubmitting) return;
    setIsSubmitting(true);
    setLoginError('');
    try {
      const slot = chooseAccountSlot(history);
      await stagePendingLogin(cleanToken, isBot);
      sessionStorage.setItem('current-session', JSON.stringify({ slot, isBot, pending: true }));
      window.location.assign('/@me');
    } catch (error) {
      console.error('Could not start login:', error);
      setLoginError('ログイン情報を安全に保存できませんでした。しばらくしてから再試行してください。');
      setIsSubmitting(false);
    }
  };

  const handleSavedLogin = (account) => {
    sessionStorage.setItem('current-session', JSON.stringify({ slot: account.slot, isBot: account.isBot, pending: false }));
    window.location.assign('/@me');
  };

  const deleteHistory = async (e, account) => {
    e.stopPropagation();
    try {
      await deleteStoredAccount(account.slot);
      const newHistory = saveAccountHistory(history.filter((item) => item.slot !== account.slot));
      setHistory(newHistory);
    } catch (error) {
      console.error('Could not delete the saved account:', error);
      setLoginError('保存済みアカウントを削除できませんでした。');
    }
  };
  
  const deleteAllHistory = async () => {
    try {
      await deleteAllStoredAccounts();
      setHistory(saveAccountHistory([]));
    } catch (error) {
      console.error('Could not clear saved accounts:', error);
      setLoginError('ログイン履歴を削除できませんでした。');
    }
  };

  return (
    <div className="home-screen min-h-screen w-full bg-white dark:bg-black text-gray-900 dark:text-gray-100 flex flex-col font-google light-scrollbar transition-colors duration-300 relative">
      <Header />
      <div className="flex-grow flex flex-col relative w-full overflow-hidden">
        <MouseEffectCard className="absolute inset-0 z-0 bg-transparent border-none rounded-none"><div className="w-full h-full"></div></MouseEffectCard>
        <main className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center py-16 md:py-20 px-4 relative z-10">
            <Motion.div className="w-full flex flex-col items-center" variants={reduceMotion ? undefined : containerVariants} initial="hidden" animate="visible">
                <div className="text-center mb-8 md:mb-10">
                    <Motion.div variants={entranceVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shadow-sm mb-6">
                        <FaDiscord className="text-[#5865F2]" /><span className="text-xs font-bold text-gray-600 dark:text-gray-300 tracking-wide font-ggsans">DISCORD</span>
                    </Motion.div>
                    <Motion.h2 variants={entranceVariants} className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-2 leading-tight font-google">高速軽量 Socket.io</Motion.h2>
                    <Motion.h1 variants={entranceVariants} className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#404EED] mb-6 leading-tight font-google">Discord Web Token Client</Motion.h1>
                    <Motion.p variants={entranceVariants} className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
                        Bot/UserのTokenをWebブラウザで動かせるオープンソースプロジェクトです。<br/>
                        軽量化や、複数アカウントのプレビュー確認などに最適です。
                    </Motion.p>
                </div>

                {loginError ? <p role="alert" className="mb-6 text-sm font-bold text-red-500">{loginError}</p> : null}

                {history.length > 0 && (
                    <Motion.div 
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.985 }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-4xl mb-8 md:mb-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-lg p-6"
                    >
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2"><FaHistory className="text-gray-400" /><h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider font-google">ログイン履歴</h3></div>
                            <NativeDelete buttonText="Clear All" confirmText="Confirm Clear" size="sm" onDelete={deleteAllHistory} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {history.map((item, i) => (
                                <div key={item.id || i} onClick={() => handleSavedLogin(item)} className="relative bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden group">
                                    <div className="relative shrink-0"><img src={item.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-zinc-700" alt={item.username || "User"} /><div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-50 dark:border-zinc-800/50 flex items-center justify-center text-[7px] ${item.isBot ? 'bg-[#5865F2]' : 'bg-gray-600'} text-white shadow-sm`}>{item.isBot ? <FaRobot /> : <FaUser />}</div></div>
                                    <div className="flex-1 min-w-0 text-left"><div className="font-bold text-gray-900 dark:text-gray-100 truncate text-sm">{item.username || "Unknown"}</div><div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate max-w-full">ID: {item.id}</div></div>
                                    <button onClick={(e) => deleteHistory(e, item)} className="text-gray-400 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors p-2 opacity-100 absolute top-1 right-1 z-10" title="履歴から削除"><FaTrash size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </Motion.div>
                )}

                <Motion.div 
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.985 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full max-w-4xl shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm text-gray-900 dark:text-white flex flex-col md:flex-row min-h-[380px]"
                >
                    <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-gray-200 dark:border-zinc-800 flex flex-col items-center justify-center relative">
                        <div className="w-full max-w-xs text-center relative z-10">
                            <h3 className="text-xl font-bold mb-2 font-google text-gray-900 dark:text-white">User Token</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-mono tracking-tight">個人アカウント用ログイン (Selfbotv13)</p>
                            <div className="space-y-4 w-full text-center">
                                <input type="password" value={userToken} onChange={(e) => setUserToken(e.target.value)} placeholder="User Token を入力..." className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-[#5865F2] focus:border-transparent block p-3 outline-none transition-all placeholder-gray-400 dark:placeholder-zinc-500 text-center font-mono shadow-sm"/>
                                <div className="flex justify-center">
                                    <InteractiveHoverButton text="Login" onClick={() => handleLogin(userToken, false)} />
                                </div>
                                <button onClick={() => setShowTokenHelp(true)} className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors mx-auto pt-2 font-google">
                                    <FaQuestionCircle />Discordトークンの入手方法は？
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 p-8 md:p-10 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-white/[0.02] relative">
                        <div className="w-full max-w-xs text-center relative z-10">
                            <h3 className="text-xl font-bold mb-2 font-google text-gray-900 dark:text-white">Bot Token</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 font-mono tracking-tight">公式BOTログイン (Discord.js)</p>
                            <div className="space-y-4 w-full text-center">
                                <input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="Bot Token を入力..." className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-2 focus:ring-[#5865F2] focus:border-transparent block p-3 outline-none transition-all placeholder-gray-400 dark:placeholder-zinc-500 text-center font-mono shadow-sm"/>
                                <div className="flex justify-center">
                                    <InteractiveHoverButton text="Login" onClick={() => handleLogin(botToken, true)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Motion.div>
            </Motion.div>
        </main>
      </div>
      <Footer />
      <AnimatePresence>
        {showTokenHelp && (
          <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-google" onClick={() => setShowTokenHelp(false)}>
            <Motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white dark:bg-zinc-950 rounded-2xl p-6 md:p-8 max-w-2xl w-full relative shadow-2xl border border-gray-100 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowTokenHelp(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer p-2 bg-gray-100 dark:bg-zinc-900 rounded-full font-google"><FaTimes size={16}/></button>
              <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2 font-google"><FaDiscord className="text-[#5865F2]" />トークンの入手方法</h3>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-google">
                  <div className="flex gap-3 font-google"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold shrink-0">1</span><p>Discordをブラウザで開き、<strong>F12</strong>キー（MacはCmd+Option+I）でデベロッパーツールを開きます。</p></div>
                  <div className="flex gap-3 font-google"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold shrink-0">2</span><p><strong>Network</strong>（ネットワーク）タブを選択し、フィルターに「<strong>/api</strong>」と入力します。</p></div>
                  <div className="flex gap-3 font-google"><span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold shrink-0">3</span><p>ページを更新するか何か操作を行い、表示された通信の<strong>Headers</strong>内にある「<strong>authorization</strong>」の値があなたのトークンです。</p></div>
                  <div className="mt-6 flex justify-center bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 p-2 shadow-inner overflow-hidden">
                      <img src="/token.webp" alt="Discordのauthorizationヘッダーからトークンを確認する方法" width="600" height="300" className="rounded-lg max-h-[50vh] w-auto object-contain"/>
                  </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
