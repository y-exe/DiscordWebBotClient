export const API_URL = (import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? '' : 'https://dapi.yexe.xyz')).replace(/\/$/, '');

const PROXY_IMAGE_HOSTS = new Set([
  'cdn.discordapp.com',
  'media.discordapp.net',
  'images-ext-1.discordapp.net',
  'images-ext-2.discordapp.net'
]);

export const getProxyUrl = (url) => {
  if (typeof url !== 'string') return '';
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'blob:' ? parsed.href : '';
  } catch {
    return '';
  }
};

export const getFallbackProxyUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !PROXY_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) return '';
    return `${API_URL}/api/image-proxy?url=${encodeURIComponent(parsed.href)}`;
  } catch {
    return '';
  }
};

export const formatTimestamp = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('ja-JP', {hour:'2-digit', minute:'2-digit'});
  if (d.toDateString() === now.toDateString()) return time;
  return `${d.toLocaleDateString('ja-JP')} ${time}`;
};
