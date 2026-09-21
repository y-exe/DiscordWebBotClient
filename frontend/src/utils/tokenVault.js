import { API_URL } from './helpers';

const HISTORY_KEY = 'discord-client-history-v2';
const LEGACY_COOKIE_NAME = 'discord-client-history';
const ACCOUNT_LIMIT = 5;

const validSlot = (value) => Number.isInteger(value) && value >= 0 && value < ACCOUNT_LIMIT;

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
  });
  if (!response.ok) throw new Error(`Token vault request failed (${response.status})`);
};

const safeMetadata = (account, fallbackSlot = 0) => {
  if (!account || typeof account !== 'object') return null;
  const slot = validSlot(account.slot) ? account.slot : (validSlot(fallbackSlot) ? fallbackSlot : 0);
  const { token: _token, ...metadata } = account;
  return {
    ...metadata,
    slot,
    isBot: account.isBot === true,
    id: account.id || '',
    username: account.username || 'User',
    avatar: account.avatar || ''
  };
};

export const loadAccountHistory = () => {
  if (typeof window === 'undefined') return [];
  try {
    // 1. 新キー (v2)
    const rawV2 = localStorage.getItem(HISTORY_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = parsed.map((item, index) => safeMetadata(item, item?.slot ?? index)).filter(Boolean).slice(0, ACCOUNT_LIMIT);
        if (sanitized.length > 0) return sanitized;
      }
    }

    // 2. localStorage の全キーから 'history' を含むキーを探索
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.includes('history')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            const sanitized = parsed.map((item, idx) => safeMetadata(item, idx)).filter(Boolean).slice(0, ACCOUNT_LIMIT);
            if (sanitized.length > 0) {
              localStorage.setItem(HISTORY_KEY, JSON.stringify(sanitized));
              return sanitized;
            }
          }
        } catch {}
      }
    }

    // 3. Cookie からの探索
    const legacyCookie = readLegacyHistory();
    if (legacyCookie.length > 0) {
      const sanitized = legacyCookie.map((item, index) => safeMetadata(item, index)).filter(Boolean).slice(0, ACCOUNT_LIMIT);
      if (sanitized.length > 0) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
    }

    return [];
  } catch (e) {
    console.error('Error loading account history:', e);
    return [];
  }
};

export const saveAccountHistory = (history) => {
  if (typeof window === 'undefined') return [];
  const safeHistory = Array.isArray(history) 
    ? history.map((item, index) => safeMetadata(item, item?.slot ?? index)).filter(Boolean).slice(0, ACCOUNT_LIMIT) 
    : [];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(safeHistory));
  return safeHistory;
};

export const chooseAccountSlot = (history) => {
  const used = new Set(history.map((account) => account.slot).filter(validSlot));
  for (let slot = 0; slot < ACCOUNT_LIMIT; slot += 1) {
    if (!used.has(slot)) return slot;
  }
  return history.at(-1)?.slot ?? 0;
};

export const stagePendingLogin = (token, isBot) => request('/api/auth/pending', {
  method: 'POST',
  body: JSON.stringify({ token, isBot }),
});

export const commitPendingLogin = (slot) => request(`/api/auth/accounts/${slot}/commit`, { method: 'POST' });
export const refreshStoredAccount = (slot) => request(`/api/auth/accounts/${slot}/refresh`, { method: 'POST' });
export const clearPendingLogin = () => request('/api/auth/pending', { method: 'DELETE' });
export const deleteStoredAccount = (slot) => request(`/api/auth/accounts/${slot}`, { method: 'DELETE' });
export const deleteAllStoredAccounts = () => request('/api/auth/accounts', { method: 'DELETE' });

const readLegacyHistory = () => {
  if (typeof document === 'undefined') return [];
  try {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith(`${LEGACY_COOKIE_NAME}=`)) {
        const raw = trimmed.slice(LEGACY_COOKIE_NAME.length + 1);
        try {
          const parsed = JSON.parse(decodeURIComponent(raw));
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
  } catch {}
  if (typeof localStorage !== 'undefined') {
    try {
      const rawLocal = localStorage.getItem(LEGACY_COOKIE_NAME);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return [];
};

const clearLegacyHistory = () => {
  if (typeof document !== 'undefined') {
    document.cookie = `${LEGACY_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Strict`;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(LEGACY_COOKIE_NAME);
  }
};

export const migrateLegacyAccounts = async () => {
  const currentHistory = loadAccountHistory();
  const legacyHistory = readLegacyHistory().slice(0, ACCOUNT_LIMIT);
  if (!legacyHistory.length) return currentHistory;

  const migrated = [...currentHistory];
  for (let i = 0; i < legacyHistory.length; i += 1) {
    const account = legacyHistory[i];
    const slot = validSlot(account?.slot) ? account.slot : i;
    if (typeof account?.token === 'string' && account.token.trim()) {
      try {
        await request(`/api/auth/accounts/${slot}`, {
          method: 'POST',
          body: JSON.stringify({ token: account.token.trim(), isBot: account.isBot === true }),
        });
      } catch (e) {
        console.warn(`Could not sync legacy account slot ${slot} to backend cookie:`, e);
      }
    }
    const safe = safeMetadata({ ...account, slot }, slot);
    if (safe && !migrated.some((item) => item.slot === safe.slot || (safe.id && item.id === safe.id))) {
      migrated.push(safe);
    }
  }

  const history = saveAccountHistory(migrated);
  clearLegacyHistory();
  return history;
};
