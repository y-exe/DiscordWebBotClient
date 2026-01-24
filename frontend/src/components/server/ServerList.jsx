import { useEffect, useMemo, useState } from 'react';
import Symbol from '../common/Symbol';
import { ServerAvatar, ServerEntry, FolderIcon, TooltipContent } from './ServerEntries';
import { FOLDER_COLORS, FOLDER_COLOR_OPTIONS, GUILD_MUTE_OPTIONS, layoutKey, createDefaultLayout, normalizeLayout, readLayout } from './serverLayout';
import ActionMenu from '../common/ActionMenu';

import { getProxyUrl } from '../../utils/helpers';

const ServerList = ({ guilds, currentGuildId, onSelect, user, onSettings, onUserClick, onAddServer, onGuildSettings, onGuildInvite, onGuildLeave, canManageGuild, canInvite, guildSelfSettings, onGuildMenuOpen, onGuildMarkRead, onGuildMute, onGuildNotify }) => {
  const [layout, setLayout] = useState(() => createDefaultLayout(guilds));
  const [loadedKey, setLoadedKey] = useState('');
  const [menu, setMenu] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const guildMap = useMemo(() => Object.fromEntries(guilds.map((guild) => [guild.id, guild])), [guilds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayout(readLayout(user, guilds));
    setLoadedKey(layoutKey(user));
  }, [user, guilds]);

  useEffect(() => {
    if (!guilds.length || loadedKey !== layoutKey(user)) return;
    window.localStorage.setItem(layoutKey(user), JSON.stringify(layout));
  }, [layout, guilds.length, loadedKey, user?.id]);

  const updateLayout = (updater) => {
    setLayout((current) => normalizeLayout(typeof updater === 'function' ? updater(current) : updater, guilds));
  };

  const moveEntry = (dragged, target) => {
    if (!dragged || !target) return;
    if (dragged.type === 'guild' && target.type === 'folder-guild') {
      updateLayout((current) => {
        const folders = Object.fromEntries(Object.entries(current.folders).map(([id, folder]) => [id, {
          ...folder,
          guildIds: folder.guildIds.filter((guildId) => guildId !== dragged.id)
        }]));
        const targetFolder = folders[target.folderId];
        if (!targetFolder) return current;
        const targetIndex = targetFolder.guildIds.indexOf(target.id);
        if (targetIndex < 0) return current;
        targetFolder.guildIds.splice(targetIndex, 0, dragged.id);
        return {
          ...current,
          folders,
          order: current.order.filter((entry) => !(entry.type === 'guild' && entry.id === dragged.id))
        };
      });
      return;
    }

    if (dragged.type === 'guild' && target.type === 'folder') {
      updateLayout((current) => {
        const folders = Object.fromEntries(Object.entries(current.folders).map(([id, folder]) => [id, { ...folder }]));
        const targetFolder = folders[target.id];
        if (!targetFolder || targetFolder.guildIds.includes(dragged.id)) return current;
        Object.values(folders).forEach((folder) => {
          folder.guildIds = folder.guildIds.filter((id) => id !== dragged.id);
        });
        folders[target.id] = { ...targetFolder, collapsed: false, guildIds: [...targetFolder.guildIds, dragged.id] };
        return {
          ...current,
          folders,
          order: current.order.filter((entry) => !(entry.type === 'guild' && entry.id === dragged.id))
        };
      });
      return;
    }

    updateLayout((current) => {
      const folders = Object.fromEntries(Object.entries(current.folders).map(([id, folder]) => [
        id,
        dragged.type === 'guild' ? { ...folder, guildIds: folder.guildIds.filter((guildId) => guildId !== dragged.id) } : { ...folder }
      ]));
      const sameEntry = (entry, other) => entry.type === other.type && entry.id === other.id;
      const withoutDragged = current.order.filter((entry) => !sameEntry(entry, dragged));
      const targetIndex = withoutDragged.findIndex((entry) => sameEntry(entry, target));
      if (targetIndex < 0) return current;
      withoutDragged.splice(targetIndex, 0, dragged);
      return { ...current, folders, order: withoutDragged };
    });
  };

  const createFolder = (guildId) => {
    updateLayout((current) => {
      const folderId = `folder-${Date.now()}`;
      return {
        order: current.order.map((entry) => (
          entry.type === 'guild' && entry.id === guildId ? { type: 'folder', id: folderId } : entry
        )),
        folders: {
          ...current.folders,
          [folderId]: {
            id: folderId,
            name: guildMap[guildId]?.name ? `${guildMap[guildId].name} フォルダー` : 'フォルダー',
            color: FOLDER_COLORS[0],
            collapsed: false,
            guildIds: [guildId]
          }
        }
      };
    });
    setMenu(null);
  };

  const setFolder = (folderId, changes) => {
    updateLayout((current) => ({
      ...current,
      folders: {
        ...current.folders,
        [folderId]: { ...current.folders[folderId], ...changes }
      }
    }));
  };

  const moveGuildToFolder = (guildId, folderId) => {
    moveEntry({ type: 'guild', id: guildId }, { type: 'folder', id: folderId });
    setMenu(null);
  };

  const removeGuildFromFolder = (guildId, folderId) => {
    updateLayout((current) => {
      const folder = current.folders[folderId];
      if (!folder) return current;
      return {
        ...current,
        folders: {
          ...current.folders,
          [folderId]: { ...folder, guildIds: folder.guildIds.filter((id) => id !== guildId) }
        },
        order: [...current.order, { type: 'guild', id: guildId }]
      };
    });
    setMenu(null);
  };

  const dissolveFolder = (folderId) => {
    updateLayout((current) => {
      const folder = current.folders[folderId];
      if (!folder) return current;
      const folders = { ...current.folders };
      delete folders[folderId];
      return {
        folders,
        order: current.order.flatMap((entry) => entry.type === 'folder' && entry.id === folderId
          ? folder.guildIds.map((id) => ({ type: 'guild', id }))
          : [entry])
      };
    });
    setMenu(null);
  };

  const createDragPreview = (entry) => {
    const preview = document.createElement('div');
    preview.className = 'app-drag-preview';

    if (entry.type === 'folder') {
      const folder = layout.folders[entry.id];
      preview.classList.add('folder');
      // フォルダプレビュー背景を 30% 透過で重ねる
      if (folder?.color) preview.style.background = `color-mix(in srgb, ${folder.color} 30%, transparent)`;
      preview.textContent = folder?.name?.slice(0, 2) || '';
      return preview;
    }

    const guild = guildMap[entry.id];
    if (guild?.icon) {
      const img = document.createElement('img');
      img.src = getProxyUrl(guild.icon);
      img.draggable = false;
      preview.appendChild(img);
    } else {
      preview.textContent = guild?.acronym || guild?.name?.slice(0, 2) || '';
    }

    return preview;
  };

  const dragPayload = (entry, folderId = null) => (e) => {
    const dragImage = createDragPreview(entry);
    document.body.appendChild(dragImage);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({ ...entry, folderId }));
    e.dataTransfer.setDragImage(dragImage, 21, 21);
    window.requestAnimationFrame(() => dragImage.remove());
    setDragging(entry);
  };

  const entryKey = (entry) => entry ? `${entry.type}:${entry.id}` : '';
  const isSameEntry = (a, b) => entryKey(a) === entryKey(b);
  const showTooltip = (label) => (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, x: rect.right + 10, y: rect.top + (rect.height / 2) });
  };
  const hideTooltip = () => setTooltip(null);

  const clearDrag = () => {
    setDragging(null);
    setDragTarget(null);
  };

  const guildMenuItems = (guildId, folderId) => {
    const guildSettings = guildSelfSettings?.[guildId];
    const muted = Boolean(guildSettings?.muted);
    const notifyValue = guildSettings?.messageNotifications;
    const folders = Object.values(layout.folders).filter((targetFolder) => targetFolder.id !== folderId);
    const items = [
      { id: 'ack', label: '既読にする', icon: <Symbol size={18}>mark_chat_read</Symbol>, onClick: () => onGuildMarkRead?.(guildId) },
      { type: 'divider' },
      ...(muted ? [
        { id: 'unmute', label: 'サーバーのミュートを解除', icon: <Symbol size={18}>do_not_disturb_off</Symbol>, onClick: () => onGuildMute?.(guildId, false) },
      ] : [
        {
          id: 'mute',
          label: 'サーバーのミュート',
          icon: <Symbol size={18}>do_not_disturb_on</Symbol>,
          items: [
            ...GUILD_MUTE_OPTIONS.map(([value, label]) => ({ id: `mute-${value}`, label, onClick: () => onGuildMute?.(guildId, value) })),
            { id: 'mute-forever', label: '元に戻すまで', onClick: () => onGuildMute?.(guildId, true) },
          ],
        },
      ]),
      {
        id: 'add-folder',
        label: 'フォルダーに追加',
        icon: <Symbol size={18}>folder</Symbol>,
        items: [
          ...folders.map((targetFolder) => ({ id: `to-folder-${targetFolder.id}`, label: targetFolder.name, onClick: () => moveGuildToFolder(guildId, targetFolder.id) })),
          { id: 'new-folder', label: '新しいフォルダー', icon: <Symbol size={18}>create_new_folder</Symbol>, onClick: () => createFolder(guildId) },
        ],
      },
      ...(folderId ? [
        { id: 'remove-folder', label: 'フォルダーから削除', icon: <Symbol size={18}>folder_off</Symbol>, onClick: () => removeGuildFromFolder(guildId, folderId) },
      ] : []),
      { type: 'divider' },
      {
        id: 'notify',
        label: '通知',
        icon: <Symbol size={18}>notification_settings</Symbol>,
        items: [
          { id: 'notify-all', label: 'すべてのメッセージ', icon: <Symbol size={18}>notifications_active</Symbol>, radio: true, selected: notifyValue === 1, onClick: () => onGuildNotify?.(guildId, 1) },
          { id: 'notify-mention', label: 'メンションのみ', icon: <Symbol size={18}>alternate_email</Symbol>, radio: true, selected: notifyValue === 0, onClick: () => onGuildNotify?.(guildId, 0) },
          { id: 'notify-none', label: '何も通知しない', icon: <Symbol size={18}>notifications_off</Symbol>, radio: true, selected: notifyValue === 2, onClick: () => onGuildNotify?.(guildId, 2) },
        ],
      },
      { type: 'divider' },
    ];
    if (canInvite?.(guildId)) items.push({ id: 'invite', label: '招待を作成', icon: <Symbol size={18}>person_add</Symbol>, onClick: () => onGuildInvite?.(guildId) });
    if (canManageGuild?.(guildId)) items.push({ id: 'settings', label: 'サーバー設定を開く', icon: <Symbol size={18}>settings</Symbol>, onClick: () => onGuildSettings?.(guildId) });
    if (canInvite?.(guildId) || canManageGuild?.(guildId)) items.push({ type: 'divider' });
    items.push(
      { id: 'leave', label: 'サーバーから退出', icon: <Symbol size={18}>logout</Symbol>, danger: true, onClick: () => {
        if (!window.confirm(`${guildMap[guildId]?.name || 'このサーバー'} から退出しますか?`)) return;
        onGuildLeave?.(guildId);
      } },
      { id: 'copy-id', label: 'サーバーIDをコピー', icon: <Symbol size={18}>badge</Symbol>, onClick: () => navigator.clipboard?.writeText(guildId) },
    );
    return items;
  };

  const folderMenuItems = (folder) => [
    { id: 'rename', label: 'フォルダーを編集', icon: <Symbol size={18}>drive_file_rename_outline</Symbol>, onClick: () => {
      const name = window.prompt('フォルダー名', folder.name);
      if (name?.trim()) setFolder(folder.id, { name: name.trim() });
    } },
    {
      id: 'color',
      label: 'フォルダーの色',
      icon: <Symbol size={18}>palette</Symbol>,
      items: FOLDER_COLOR_OPTIONS.map(([color, label]) => ({
        id: `color-${color}`,
        label,
        radio: true,
        selected: folder.color === color,
        onClick: () => setFolder(folder.id, { color }),
      })),
    },
    { type: 'divider' },
    { id: 'delete', label: 'フォルダーを削除', icon: <Symbol size={18}>delete</Symbol>, danger: true, onClick: () => dissolveFolder(folder.id) },
  ];

  const dropOn = (target) => (e) => {
    e.preventDefault();
    try {
      moveEntry(JSON.parse(e.dataTransfer.getData('application/json')), target);
    } catch { /* 不正なドラッグデータは無視 */ }
    clearDrag();
  };

  const dragOverTarget = (target) => (e) => {
    e.preventDefault();
    if (!dragging || isSameEntry(dragging, target)) return;
    setDragTarget(target);
  };

  const renderGuildEntry = (guild, folderId = null, compact = false) => {
    const target = folderId ? { type: 'folder-guild', folderId, id: guild.id } : { type: 'guild', id: guild.id };
    return (
      <ServerEntry
        key={guild.id}
        guild={guild}
        compact={compact}
        currentGuildId={currentGuildId}
        onSelect={onSelect}
        draggable
        onDragStart={dragPayload({ type: 'guild', id: guild.id }, folderId)}
        onDragEnd={clearDrag}
        onDragEnter={dragOverTarget(target)}
        onDragOver={dragOverTarget(target)}
        onDrop={dropOn(target)}
        dropTarget={entryKey(dragTarget) === entryKey(target)}
        draggingSelf={entryKey(dragging) === entryKey({ type: 'guild', id: guild.id })}
        onMouseEnter={showTooltip(guild.name)}
        onMouseLeave={hideTooltip}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onGuildMenuOpen?.(guild.id);
          setMenu({ type: 'guild', guildId: guild.id, folderId, x: e.clientX, y: e.clientY });
        }}
      />
    );
  };

  return (
    <nav className="app-rail" data-dragging={dragging ? 'true' : 'false'} onClick={() => setMenu(null)}>
      <div className="app-rail-scroll no-scrollbar">
        <button
          type="button"
          className="app-rail-entry"
          data-selected={currentGuildId === '@me'}
          onClick={() => onSelect('@me')}
          onMouseEnter={showTooltip('ホーム')}
          onMouseLeave={hideTooltip}
          aria-label="ホーム"
        >
          <ServerAvatar><Symbol size={24} fill>home</Symbol></ServerAvatar>
        </button>

        <button
          type="button"
          className="app-rail-entry"
          onClick={(e) => onUserClick?.(e)}
          onMouseEnter={showTooltip(user?.username || 'ユーザー')}
          onMouseLeave={hideTooltip}
          aria-label={user?.username || 'ユーザー'}
        >
          <span className="app-user-avatar-wrap">
            <span className="app-avatar">
              <md-ripple />
              {user?.avatar ? <img src={getProxyUrl(user.avatar)} alt="" /> : (user?.username?.[0] || 'U')}
            </span>
            <span className="app-online-dot" />
          </span>
        </button>

        <div className="app-rail-divider" />

        {layout.order.map((entry) => {
          if (entry.type === 'guild') {
            const guild = guildMap[entry.id];
            return guild ? renderGuildEntry(guild) : null;
          }

          const folder = layout.folders[entry.id];
          if (!folder) return null;
          const folderGuilds = folder.guildIds.map((id) => guildMap[id]).filter(Boolean);
          const isOpen = !folder.collapsed;
          const selectedInFolder = folder.guildIds.includes(currentGuildId);

          return (
            <div
              key={folder.id}
              className="app-folder-group"
              data-open={isOpen ? 'true' : 'false'}
              data-drop-target={entryKey(dragTarget) === entryKey({ type: 'folder', id: folder.id }) ? 'true' : 'false'}
              style={isOpen && folder.color ? { background: `color-mix(in srgb, ${folder.color} 18%, transparent)` } : undefined}
            >
              <button
                type="button"
                className="app-rail-entry"
                data-selected={selectedInFolder}
                data-dragging-self={entryKey(dragging) === entryKey({ type: 'folder', id: folder.id }) ? 'true' : 'false'}
                draggable
                onDragStart={dragPayload({ type: 'folder', id: folder.id })}
                onDragEnd={clearDrag}
                onDragEnter={dragOverTarget({ type: 'folder', id: folder.id })}
                onDragOver={dragOverTarget({ type: 'folder', id: folder.id })}
                onDrop={dropOn({ type: 'folder', id: folder.id })}
                onMouseEnter={showTooltip(folder.name)}
                onMouseLeave={hideTooltip}
                onClick={(e) => {
                  e.stopPropagation();
                  setFolder(folder.id, { collapsed: !folder.collapsed });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenu({ type: 'folder', folderId: folder.id, x: e.clientX, y: e.clientY });
                }}
                aria-label={folder.name}
              >
                <FolderIcon folder={folder} guilds={guilds} open={isOpen} />
              </button>
              {isOpen && (
                <div className="app-folder-children">
                  {folderGuilds.map((guild) => renderGuildEntry(guild, folder.id, true))}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="app-rail-entry"
          onMouseEnter={showTooltip('サーバーを作成または参加')}
          onMouseLeave={hideTooltip}
          onClick={(event) => onAddServer?.(event)}
          aria-label="サーバーを作成または参加"
        >
          <ServerAvatar><Symbol size={22}>add</Symbol></ServerAvatar>
        </button>

        <button type="button" className="app-rail-entry" onMouseEnter={showTooltip('発見')} onMouseLeave={hideTooltip} aria-label="発見">
          <ServerAvatar><Symbol size={22} fill>explore</Symbol></ServerAvatar>
        </button>
      </div>

      <div className="h-0 relative z-[1]">
        <div className="absolute h-3 -mt-3 w-full bg-gradient-to-b from-transparent to-[var(--app-surface-container-highest)]" />
      </div>

      <button
        type="button"
        className="app-rail-entry"
        onClick={() => onSettings?.()}
        onMouseEnter={showTooltip('設定')}
        onMouseLeave={hideTooltip}
        aria-label="設定"
      >
        <ServerAvatar><Symbol size={22} fill>settings</Symbol></ServerAvatar>
      </button>

      {menu && (
        <ActionMenu
          x={menu.x}
          y={menu.y}
          width={224}
          onClose={() => setMenu(null)}
          items={menu.type === 'guild'
            ? guildMenuItems(menu.guildId, menu.folderId)
            : folderMenuItems(layout.folders[menu.folderId])}
        />
      )}
      {tooltip && !dragging && (
        <div className="app-rail-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <TooltipContent text={tooltip.label} />
        </div>
      )}
    </nav>
  );
};


export default ServerList;
