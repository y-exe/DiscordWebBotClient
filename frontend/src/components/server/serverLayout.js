export const FOLDER_COLORS = ['#5865f2', '#8c5fd3', '#3abf7e', '#f39f00', '#f84848', '#54ecc1', '#549bec'];

export const FOLDER_COLOR_OPTIONS = [
  ['#5865f2', 'ブルー'], ['#8c5fd3', 'パープル'], ['#3abf7e', 'グリーン'], ['#f39f00', 'オレンジ'],
  ['#f84848', 'レッド'], ['#54ecc1', 'ティール'], ['#549bec', 'スカイ'],
];

export const GUILD_MUTE_OPTIONS = [
  [900, '15分'], [3600, '1時間'], [10800, '3時間'], [28800, '8時間'], [86400, '24時間'],
];

export const layoutKey = (user) => `app-server-layout:${user?.id || 'anonymous'}`;

export const createDefaultLayout = (guilds) => ({
  order: guilds.map((guild) => ({ type: 'guild', id: guild.id })),
  folders: {}
});

export const normalizeLayout = (layout, guilds) => {
  const guildIds = new Set(guilds.map((guild) => guild.id));
  const folders = {};
  const assigned = new Set();

  Object.values(layout?.folders || {}).forEach((folder) => {
    const guildIdsInFolder = (folder.guildIds || []).filter((id) => guildIds.has(id));
    if (!guildIdsInFolder.length) return;
    guildIdsInFolder.forEach((id) => assigned.add(id));
    folders[folder.id] = {
      id: folder.id,
      name: folder.name || 'フォルダー',
      color: FOLDER_COLORS.includes(folder.color) ? folder.color : FOLDER_COLORS[0],
      collapsed: Boolean(folder.collapsed),
      guildIds: guildIdsInFolder
    };
  });

  const order = [];
  const seenFolders = new Set();
  (layout?.order || []).forEach((entry) => {
    if (entry.type === 'folder' && folders[entry.id] && !seenFolders.has(entry.id)) {
      seenFolders.add(entry.id);
      order.push({ type: 'folder', id: entry.id });
      return;
    }
    if (entry.type === 'guild' && guildIds.has(entry.id) && !assigned.has(entry.id)) {
      assigned.add(entry.id);
      order.push({ type: 'guild', id: entry.id });
    }
  });

  Object.values(folders).forEach((folder) => {
    if (!seenFolders.has(folder.id)) order.push({ type: 'folder', id: folder.id });
  });

  guilds.forEach((guild) => {
    if (!assigned.has(guild.id)) order.push({ type: 'guild', id: guild.id });
  });

  return { order, folders };
};

export const readLayout = (user, guilds) => {
  try {
    const raw = window.localStorage.getItem(layoutKey(user));
    return normalizeLayout(raw ? JSON.parse(raw) : createDefaultLayout(guilds), guilds);
  } catch {
    return createDefaultLayout(guilds);
  }
};
