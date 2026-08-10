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

const safeMetadata = (account) => {
  if (!account || typeof account !== 'object' || !validSlot(account.slot)) return null;
  const { token: _token, ...metadata } = account;
  return { ...metadata, slot: account.slot, isBot: account.isBot === true };
};

export const loadAccountHistory = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(safeMetadata).filter(Boolean).slice(0, ACCOUNT_LIMIT);
  } catch {
    localStorage.removeItem(HISTORY_KEY);
    return [];
  }
};

export const saveAccountHistory = (history) => {
  const safeHistory = Array.isArray(history) ? history.map(safeMetadata).filter(Boolean).slice(0, ACCOUNT_LIMIT) : [];
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
  const prefix = `${LEGACY_COOKIE_NAME}=`;
  const raw = document.cookie.split('; ').find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const clearLegacyHistory = () => {
  document.cookie = `${LEGACY_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Strict`;
};

export const migrateLegacyAccounts = async () => {
  const legacyHistory = readLegacyHistory().slice(0, ACCOUNT_LIMIT);
  if (!legacyHistory.length) return loadAccountHistory();

  const migrated = [];
  for (let slot = 0; slot < legacyHistory.length; slot += 1) {
    const account = legacyHistory[slot];
    if (typeof account?.token !== 'string' || !account.token.trim()) continue;
    await request(`/api/auth/accounts/${slot}`, {
      method: 'POST',
      body: JSON.stringify({ token: account.token.trim(), isBot: account.isBot === true }),
    });
    migrated.push(safeMetadata({ ...account, slot }));
  }

  const history = saveAccountHistory(migrated.filter(Boolean));
  clearLegacyHistory();
  return history;
};
