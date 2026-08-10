import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'discord-webclient-settings-v1';

export const DEFAULT_APP_SETTINGS = Object.freeze({
  theme: 'system',
  accent: 'violet',
  blur: true,
  reducedMotion: false,
  messageSize: 16,
  messageSpacing: 8,
  interfaceFont: 'Inter',
  showSendButton: true,
  desktopNotifications: false,
  notificationSound: true,
  compactMode: false,
  developerMode: false,
});

const validValues = {
  theme: ['light', 'dark', 'system'],
  accent: ['violet', 'blue', 'green', 'orange', 'rose', 'mono'],
  interfaceFont: ['Inter', 'gg sans', 'Google Sans'],
};

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export const cleanAppSettings = (value = {}) => ({
  ...DEFAULT_APP_SETTINGS,
  theme: validValues.theme.includes(value.theme) ? value.theme : DEFAULT_APP_SETTINGS.theme,
  accent: validValues.accent.includes(value.accent) ? value.accent : DEFAULT_APP_SETTINGS.accent,
  interfaceFont: validValues.interfaceFont.includes(value.interfaceFont) ? value.interfaceFont : DEFAULT_APP_SETTINGS.interfaceFont,
  messageSize: clamp(value.messageSize, 12, 24, DEFAULT_APP_SETTINGS.messageSize),
  messageSpacing: clamp(value.messageSpacing, 0, 16, DEFAULT_APP_SETTINGS.messageSpacing),
  blur: typeof value.blur === 'boolean' ? value.blur : DEFAULT_APP_SETTINGS.blur,
  reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : DEFAULT_APP_SETTINGS.reducedMotion,
  showSendButton: typeof value.showSendButton === 'boolean' ? value.showSendButton : DEFAULT_APP_SETTINGS.showSendButton,
  desktopNotifications: typeof value.desktopNotifications === 'boolean' ? value.desktopNotifications : DEFAULT_APP_SETTINGS.desktopNotifications,
  notificationSound: typeof value.notificationSound === 'boolean' ? value.notificationSound : DEFAULT_APP_SETTINGS.notificationSound,
  compactMode: typeof value.compactMode === 'boolean' ? value.compactMode : DEFAULT_APP_SETTINGS.compactMode,
  developerMode: typeof value.developerMode === 'boolean' ? value.developerMode : DEFAULT_APP_SETTINGS.developerMode,
});

export const loadAppSettings = () => {
  try {
    return cleanAppSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
};

const applyAppSettings = (settings) => {
  const root = document.documentElement;
  root.dataset.appAccent = settings.accent;
  root.dataset.appBlur = String(settings.blur);
  root.dataset.reducedMotion = String(settings.reducedMotion);
  root.dataset.compactMessages = String(settings.compactMode);
  root.style.setProperty('--app-message-size', `${settings.messageSize}px`);
  root.style.setProperty('--app-message-group-spacing', `${settings.compactMode ? Math.min(settings.messageSpacing, 4) : settings.messageSpacing}px`);
  root.style.setProperty('--app-font', `"${settings.interfaceFont}", "gg sans", "Google Sans", sans-serif`);
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState(loadAppSettings);

  useEffect(() => {
    applyAppSettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = useCallback((patch) => {
    setSettings((current) => cleanAppSettings({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
    }));
  }, []);

  const resetSettings = useCallback(() => setSettings({ ...DEFAULT_APP_SETTINGS }), []);

  return { settings, updateSettings, resetSettings };
};
