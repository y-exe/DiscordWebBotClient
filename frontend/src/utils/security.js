const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:']);

export const safeExternalUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    if (!ALLOWED_EXTERNAL_PROTOCOLS.has(url.protocol)) return undefined;
    if (url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
};

export const safeMediaUrl = (value) => {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return undefined;
  const url = safeExternalUrl(value);
  return url?.startsWith('https://') || url?.startsWith('http://') ? url : undefined;
};

export const openExternalUrl = (value) => {
  const url = safeExternalUrl(value);
  if (!url) return false;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (opened) opened.opener = null;
  return true;
};
