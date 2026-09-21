import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeProvider } from 'next-themes'; 
import { API_URL } from './utils/helpers';
import { trackPageView } from './analytics.js';
import Login from './components/auth/Login';
import Terms from './components/legal/Terms';
import Privacy from './components/legal/Privacy';
import ChatLoadingContent from './components/chat/ChatLoadingContent';
import SidebarLoadingContent from './components/channel/SidebarLoadingContent';
import { applyAppSettings, loadAppSettings, saveAppTheme } from './hooks/useAppSettings';
import {
  clearPendingLogin,
  commitPendingLogin,
  loadAccountHistory,
  refreshStoredAccount,
  saveAccountHistory,
} from './utils/tokenVault';

let globalSocket = null;
const DiscordClient = lazy(() => import('./components/DiscordClient'));

const DiscordLoadingShell = () => {
  const isHome = useLocation().pathname.replace(/\/$/, '') === '/@me';
  return (
  <div className="app-app app-loading-shell" data-home={isHome} aria-busy="true">
    <div className="app-titlebar drag-region"><span>Discord</span></div>
    <div className="app-layout">
      <div className="app-rail items-center pt-2" aria-hidden="true">
        {Array.from({ length: 14 }, (_, item) => <span key={item} className="mx-auto my-2 h-10 w-10 shrink-0 animate-pulse rounded-full bg-[var(--app-surface-container-highest)]" />)}
      </div>
      <div className="app-sidebar" aria-hidden="true">
        {!isHome && <div className="app-sidebar-header"><span className="h-5 w-3/4 animate-pulse rounded-md bg-[var(--app-surface-container-high)]" /></div>}
        <div className="app-sidebar-scroll no-scrollbar"><SidebarLoadingContent isDMList={isHome} showTop={isHome} /></div>
      </div>
      <div className="app-content-shell">
        <main className="app-chat">
          <header className="app-chat-header" aria-hidden="true">
            {!isHome && <span className="h-5 w-40 animate-pulse rounded-md bg-[var(--app-surface-container-high)]" />}
          </header>
          {isHome ? <div className="app-workspace-progress" role="status" aria-label="ホームを読み込み中"><md-linear-progress indeterminate /></div> : <ChatLoadingContent />}
        </main>
      </div>
    </div>
  </div>
  );
};

const RequireAuth = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const sessionStr = sessionStorage.getItem('current-session');
        let session = null;
        try {
            session = sessionStr ? JSON.parse(sessionStr) : null;
        } catch {
            sessionStorage.removeItem('current-session');
        }

        if (!session || !Number.isInteger(session.slot)) {
            const history = loadAccountHistory();
            if (history.length > 0) {
                session = { slot: history[0].slot, isBot: history[0].isBot, pending: false };
            }
        }

        if (!session || !Number.isInteger(session.slot)) {
            navigate('/login', { replace: true });
            return;
        }

        if (!globalSocket) {
            globalSocket = io(API_URL, { 
                transports: ['websocket'],
                withCredentials: true,
                reconnection: true 
            });

            globalSocket.on('connect', () => { 
                globalSocket.emit('login', { slot: session.slot, pending: session.pending === true });
            });

            globalSocket.on('login-success', async ({ user: userData, isBot }) => {
                try {
                    const currentHistory = loadAccountHistory();
                    const existing = currentHistory.find((item) => item.id === userData.id && item.isBot === isBot);
                    const slot = existing?.slot ?? session.slot;
                    if (session.pending === true) await commitPendingLogin(slot);
                    else await refreshStoredAccount(slot);
                    const newHistory = [
                        { slot, isBot, ...userData },
                        ...currentHistory.filter((item) => item.slot !== slot && item.id !== userData.id),
                    ].slice(0, 5);
                    saveAccountHistory(newHistory);
                    session = { slot, isBot, pending: false };
                    sessionStorage.setItem('current-session', JSON.stringify(session));
                    setUser(userData);
                    setIsReady(true);
                } catch (error) {
                    console.error('Could not persist the login session:', error);
                    sessionStorage.removeItem('current-session');
                    globalSocket?.disconnect();
                    globalSocket = null;
                    navigate('/login', { replace: true });
                }
            });

            globalSocket.on('login-error', () => {
                if (session.pending === true) clearPendingLogin().catch(() => {});
                sessionStorage.removeItem('current-session');
                globalSocket.disconnect();
                globalSocket = null;
                navigate('/login', { replace: true });
            });
        } else {
            if (globalSocket.connected) {
                globalSocket.emit('login', { slot: session.slot, pending: session.pending === true });
            }
        }

        window.socket = globalSocket;
    }, [navigate]);

    if (!isReady || !globalSocket) {
        return <DiscordLoadingShell />;
    }

    return React.cloneElement(children, { socket: globalSocket, user });
};

const DiscordRoute = () => (
  <Suspense fallback={<DiscordLoadingShell />}>
    <RequireAuth><DiscordClient /></RequireAuth>
  </Suspense>
);

export default function App() {
  const location = useLocation();
  const [initialTheme] = useState(() => {
    const settings = loadAppSettings();
    applyAppSettings(settings);
    let theme = settings.theme;
    try {
      if (theme === 'system') {
        const previousTheme = localStorage.getItem('discord-webclient-theme') ?? localStorage.getItem('theme');
        if (['light', 'dark', 'system'].includes(previousTheme)) theme = previousTheme;
      }
      saveAppTheme(theme);
      localStorage.setItem('theme', theme);
      localStorage.removeItem('discord-webclient-theme');
    } catch { return theme; }
    return theme;
  });

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);

  return (
    <ThemeProvider attribute="class" defaultTheme={initialTheme} enableSystem>
      <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          
          <Route path="/:guildId/:channelId" element={<DiscordRoute />} />
          <Route path="/:guildId" element={<DiscordRoute />} />
          
          <Route path="/" element={ (location.pathname === '/' && location.hash === '') ? <Navigate to="/login" replace /> : <Navigate to="/@me" replace /> } />
      </Routes>
    </ThemeProvider>
  );
}
