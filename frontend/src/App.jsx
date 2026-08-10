import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { ThemeProvider } from 'next-themes'; 
import { API_URL } from './utils/helpers';

const Login = lazy(() => import('./components/auth/Login'));
const Terms = lazy(() => import('./components/legal/Terms'));
const Privacy = lazy(() => import('./components/legal/Privacy'));
const DiscordClient = lazy(() => import('./components/DiscordClient'));

const setCookie = (name, value, days) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = name + '=' + encodeURIComponent(JSON.stringify(value)) + '; expires=' + expires + '; path=/';
};

const getCookie = (name) => {
  const value = document.cookie.split('; ').reduce((result, entry) => {
    const parts = entry.split('=');
    return parts[0] === name ? decodeURIComponent(parts.slice(1).join('=')) : result;
  }, '');
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
};

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

        if (!session) {
            const history = getCookie('discord-client-history');
            if (Array.isArray(history) && history.length > 0 && history[0].token) {
                session = { token: history[0].token, isBot: history[0].isBot };
            }
        }

        if (!session || !session.token) {
            navigate('/login', { replace: true });
            return;
        }

        if (!globalSocket) {
            globalSocket = io(API_URL, { 
                transports: ['websocket'],
                reconnection: true 
            });

            globalSocket.on('connect', () => { 
                globalSocket.emit('login', { token: session.token, isBot: session.isBot }); 
            });

            globalSocket.on('login-success', ({ user: userData }) => { 
                setUser(userData);
                setIsReady(true);
                const currentHistory = getCookie('discord-client-history');
                const safeHistory = Array.isArray(currentHistory) ? currentHistory : [];
                const newHistory = [
                    { token: session.token, isBot: session.isBot === true, ...userData },
                    ...safeHistory.filter((item) => item.token !== session.token),
                ].slice(0, 5);
                setCookie('discord-client-history', newHistory, 365);
            });

            globalSocket.on('login-error', () => {
                sessionStorage.removeItem('current-session');
                globalSocket.disconnect();
                globalSocket = null;
                navigate('/login', { replace: true });
            });
        } else {
            if (globalSocket.connected) {
                globalSocket.emit('login', { token: session.token, isBot: session.isBot });
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
