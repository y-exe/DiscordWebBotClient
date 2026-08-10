import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeProvider } from 'next-themes'; 
import { API_URL } from './utils/helpers';
import {
  clearPendingLogin,
  commitPendingLogin,
  loadAccountHistory,
  refreshStoredAccount,
  saveAccountHistory,
} from './utils/tokenVault';

const Login = lazy(() => import('./components/auth/Login'));
const Terms = lazy(() => import('./components/legal/Terms'));
const Privacy = lazy(() => import('./components/legal/Privacy'));
const DiscordClient = lazy(() => import('./components/DiscordClient'));

let globalSocket = null;

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
        return (
            <div className="h-screen w-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4 font-google font-bold">
                <div className="animate-spin h-10 w-10 border-4 border-[#5865F2] rounded-full border-t-transparent"></div>
                <p className="text-lg animate-pulse">Connecting to Discord...</p>
            </div>
        );
    }

    return React.cloneElement(children, { socket: globalSocket, user });
};

export default function App() {
  const location = useLocation();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Suspense fallback={
        <div className="h-screen w-screen bg-white dark:bg-[#050505] flex items-center justify-center">
          <div className="animate-spin h-10 w-10 border-4 border-[#5865F2] rounded-full border-t-transparent"></div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          
          <Route path="/:guildId/:channelId" element={<RequireAuth><DiscordClient /></RequireAuth>} />
          <Route path="/:guildId" element={<RequireAuth><DiscordClient /></RequireAuth>} />
          
          <Route path="/" element={ (location.pathname === '/' && location.hash === '') ? <Navigate to="/login" replace /> : <Navigate to="/@me" replace /> } />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}
