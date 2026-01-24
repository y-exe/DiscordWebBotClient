import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  Hct,
  SchemeFruitSalad,
  SchemeMonochrome,
  SchemeNeutral,
  SchemeTonalSpot,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';

const STORAGE_KEY = 'discord-webclient-settings-v1';
const HOME_THEME_KEY = 'discord-webclient-home-theme';

export const DEFAULT_APP_SETTINGS = Object.freeze({
  theme: 'system',
  accent: '#5470ec',
  contrast: 0,
  variant: 'tonal_spot',
  blur: true,
  reducedMotion: false,
  messageSize: 14,
  messageSpacing: 12,
  interfaceFont: 'Inter',
  monospaceFont: 'Fira Code',
  showSendButton: true,
  desktopNotifications: false,
  notificationSound: true,
  compactMode: false,
  developerMode: false,
});

/** 旧アクセント名 → Material You シード (hex) の互換マップ */
const LEGACY_ACCENT_MAP = {
  violet: '#9f86ff',
  blue: '#72a7ff',
  green: '#66d49b',
  orange: '#ffad70',
  rose: '#ff8ca8',
  mono: '#c7c7cb',
};

/** for-web AppearanceMenu のスウォッチ */
export const ACCENT_SWATCHES = ['#FF5733', '#ffdc2f', '#9bf088', '#54ecc1', '#549bec', '#5470ec', '#8C5FD3'];

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

const VALID_VARIANTS = ['monochrome', 'neutral', 'tonal_spot', 'fruit_salad'];

export const getHomeTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  try {
    return localStorage.getItem(HOME_THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
};

export const saveHomeTheme = (theme) => {
  if (typeof window === 'undefined') return;
  if (!validValues.theme.includes(theme)) return;
  try {
    localStorage.setItem(HOME_THEME_KEY, theme);
  } catch { /* localStorage 利用不可環境は無視 */ }
};

const validValues = {
  theme: ['light', 'dark', 'system'],
  interfaceFont: ['Inter', 'Open Sans', 'Roboto', 'Noto Sans', 'Lato', 'Lexend', 'Montserrat', 'Poppins', 'Ubuntu', 'Bitter', 'Comic Neue', 'IBM Plex Sans', 'Plus Jakarta Sans', 'Atkinson Hyperlegible', 'Google Sans', 'gg sans'],
  monospaceFont: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Source Code Pro', 'Space Mono', 'Ubuntu Mono', 'IBM Plex Mono'],
};

const isValidAccent = (value) => typeof value === 'string' && HEX_PATTERN.test(value);

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export const cleanAppSettings = (value = {}) => {
  const migrated = { ...value };
  if (typeof migrated.accent === 'string' && !isValidAccent(migrated.accent)) {
    const legacyName = migrated.accent;
    const seed = LEGACY_ACCENT_MAP[legacyName];
    if (seed) {
      migrated.accent = seed;
      // 旧 'mono' はモノクロームスキームで描画していた
      if (legacyName === 'mono') migrated.variant = 'monochrome';
    }
  }
  return {
    ...DEFAULT_APP_SETTINGS,
    theme: validValues.theme.includes(value.theme) ? value.theme : DEFAULT_APP_SETTINGS.theme,
    accent: isValidAccent(migrated.accent) ? migrated.accent : DEFAULT_APP_SETTINGS.accent,
    contrast: clamp(value.contrast, -1, 1, DEFAULT_APP_SETTINGS.contrast),
    variant: VALID_VARIANTS.includes(migrated.variant) ? migrated.variant : DEFAULT_APP_SETTINGS.variant,
    interfaceFont: validValues.interfaceFont.includes(value.interfaceFont) ? value.interfaceFont : DEFAULT_APP_SETTINGS.interfaceFont,
    monospaceFont: validValues.monospaceFont.includes(value.monospaceFont) ? value.monospaceFont : DEFAULT_APP_SETTINGS.monospaceFont,
    messageSize: clamp(value.messageSize, 12, 24, DEFAULT_APP_SETTINGS.messageSize),
    messageSpacing: clamp(value.messageSpacing, 0, 16, DEFAULT_APP_SETTINGS.messageSpacing),
    blur: typeof value.blur === 'boolean' ? value.blur : DEFAULT_APP_SETTINGS.blur,
    reducedMotion: typeof value.reducedMotion === 'boolean' ? value.reducedMotion : DEFAULT_APP_SETTINGS.reducedMotion,
    showSendButton: typeof value.showSendButton === 'boolean' ? value.showSendButton : DEFAULT_APP_SETTINGS.showSendButton,
    desktopNotifications: typeof value.desktopNotifications === 'boolean' ? value.desktopNotifications : DEFAULT_APP_SETTINGS.desktopNotifications,
    notificationSound: typeof value.notificationSound === 'boolean' ? value.notificationSound : DEFAULT_APP_SETTINGS.notificationSound,
    compactMode: typeof value.compactMode === 'boolean' ? value.compactMode : DEFAULT_APP_SETTINGS.compactMode,
    developerMode: typeof value.developerMode === 'boolean' ? value.developerMode : DEFAULT_APP_SETTINGS.developerMode,
  };
};

export const loadAppSettings = () => {
  try {
    return cleanAppSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
};

export const saveAppTheme = (theme) => {
  if (!validValues.theme.includes(theme)) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadAppSettings(), theme }));
  } catch { return; }
};

/* --- Material You パレット生成 --- */

const schemeCache = new Map();

const createScheme = (seed, isDark, contrast, variant) => {
  const cacheKey = `${seed}|${isDark}|${contrast}|${variant}`;
  let scheme = schemeCache.get(cacheKey);
  if (!scheme) {
    const hct = Hct.fromInt(argbFromHex(seed));
    switch (variant) {
      case 'monochrome': scheme = new SchemeMonochrome(hct, isDark, contrast); break;
      case 'neutral': scheme = new SchemeNeutral(hct, isDark, contrast); break;
      case 'fruit_salad': scheme = new SchemeFruitSalad(hct, isDark, contrast); break;
      default: scheme = new SchemeTonalSpot(hct, isDark, contrast); break;
    }
    schemeCache.set(cacheKey, scheme);
  }
  return scheme;
};

/** 生成パレット → CSS 変数キー (for-web materialTheme.ts と同じ 46 キー) */
const schemeToCssKeys = (scheme) => ({
  primary: scheme.primary,
  'on-primary': scheme.onPrimary,
  'primary-container': scheme.primaryContainer,
  'on-primary-container': scheme.onPrimaryContainer,
  secondary: scheme.secondary,
  'on-secondary': scheme.onSecondary,
  'secondary-container': scheme.secondaryContainer,
  'on-secondary-container': scheme.onSecondaryContainer,
  tertiary: scheme.tertiary,
  'on-tertiary': scheme.onTertiary,
  'tertiary-container': scheme.tertiaryContainer,
  'on-tertiary-container': scheme.onTertiaryContainer,
  error: scheme.error,
  'on-error': scheme.onError,
  'error-container': scheme.errorContainer,
  'on-error-container': scheme.onErrorContainer,
  'primary-fixed': scheme.primaryFixed,
  'primary-fixed-dim': scheme.primaryFixedDim,
  'on-primary-fixed': scheme.onPrimaryFixed,
  'on-primary-fixed-variant': scheme.onPrimaryFixedVariant,
  'secondary-fixed': scheme.secondaryFixed,
  'secondary-fixed-dim': scheme.secondaryFixedDim,
  'on-secondary-fixed': scheme.onSecondaryFixed,
  'on-secondary-fixed-variant': scheme.onSecondaryFixedVariant,
  'tertiary-fixed': scheme.tertiaryFixed,
  'tertiary-fixed-dim': scheme.tertiaryFixedDim,
  'on-tertiary-fixed': scheme.onTertiaryFixed,
  'on-tertiary-fixed-variant': scheme.onTertiaryFixedVariant,
  'surface-dim': scheme.surfaceDim,
  surface: scheme.surface,
  'surface-bright': scheme.surfaceBright,
  'surface-container-lowest': scheme.surfaceContainerLowest,
  'surface-container-low': scheme.surfaceContainerLow,
  'surface-container': scheme.surfaceContainer,
  'surface-container-high': scheme.surfaceContainerHigh,
  'surface-container-highest': scheme.surfaceContainerHighest,
  'on-surface': scheme.onSurface,
  'on-surface-variant': scheme.onSurfaceVariant,
  outline: scheme.outline,
  'outline-variant': scheme.outlineVariant,
  'inverse-surface': scheme.inverseSurface,
  'inverse-on-surface': scheme.inverseOnSurface,
  'inverse-primary': scheme.inversePrimary,
  scrim: scheme.scrim,
  shadow: scheme.shadow,
  // 未定義のフォールバック変数 (highest と同値)
  'surface-variant': scheme.surfaceContainerHighest,
});

export const generateAppPalette = (accent, isDark, contrast = 0, variant = 'tonal_spot') => {
  const scheme = createScheme(accent, isDark, contrast, variant);
  const keys = schemeToCssKeys(scheme);
  for (const key of Object.keys(keys)) keys[key] = hexFromArgb(keys[key]);
  return keys;
};

export const applyAppSettings = (settings, darkMode) => {
  const root = document.documentElement;
  const isDark = typeof darkMode === 'boolean' ? darkMode : !root.classList.contains('light');
  const palette = generateAppPalette(settings.accent, isDark, settings.contrast, settings.variant);
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(`--app-${key}`, value);
  }
  root.dataset.appBlur = String(settings.blur);
  root.dataset.reducedMotion = String(settings.reducedMotion);
  root.dataset.compactMessages = String(settings.compactMode);
  root.style.setProperty('--app-message-size', `${settings.messageSize}px`);
  root.style.setProperty('--app-message-group-spacing', `${settings.compactMode ? Math.min(settings.messageSpacing, 4) : settings.messageSpacing}px`);
  root.style.setProperty('--app-font', `"${settings.interfaceFont}", "gg sans", "Google Sans", sans-serif`);
  root.style.setProperty('--app-font-mono', `"${settings.monospaceFont}", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`);
};

export const useAppSettings = () => {
  const [settings, setSettings] = useState(loadAppSettings);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    applyAppSettings(settings, resolvedTheme === 'light' ? false : resolvedTheme === 'dark' ? true : undefined);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    if (settings?.theme) {
      setTheme(settings.theme);
    }
  }, [settings, resolvedTheme, setTheme]);

  const updateSettings = useCallback((patch) => {
    setSettings((current) => cleanAppSettings({
      ...current,
      ...(typeof patch === 'function' ? patch(current) : patch),
    }));
  }, []);

  const resetSettings = useCallback(() => setSettings({ ...DEFAULT_APP_SETTINGS }), []);

  return { settings, updateSettings, resetSettings };
};
