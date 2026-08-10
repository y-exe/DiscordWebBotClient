import { useEffect, useMemo, useState } from 'react';
import { FaCompass, FaDiscord, FaFolder, FaFolderOpen, FaGear, FaPlus } from 'react-icons/fa6';

import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';

const TooltipContent = ({ text }) => {
  const { ref } = useTwemoji();
  return <span ref={ref}>{text}</span>;
};

const FOLDER_COLORS = ['#5865f2', '#8c5fd3', '#3abf7e', '#f39f00', '#f84848', '#54ecc1', '#549bec'];

const layoutKey = (user) => `app-server-layout:${user?.id || 'anonymous'}`;

const createDefaultLayout = (guilds) => ({
  order: guilds.map((guild) => ({ type: 'guild', id: guild.id })),
  folders: {}
});

const normalizeLayout = (layout, guilds) => {
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

const readLayout = (user, guilds) => {
  try {
    const raw = window.localStorage.getItem(layoutKey(user));
    return normalizeLayout(raw ? JSON.parse(raw) : createDefaultLayout(guilds), guilds);
  } catch {
    return createDefaultLayout(guilds);
  }
};

const ServerAvatar = ({ guild, children, primary = false }) => (
  <span className={`app-avatar ${primary ? 'app-avatar-primary' : ''}`}>
    <md-ripple />
    {children || (guild?.icon ? <img src={getProxyUrl(guild.icon)} draggable={false} alt="" /> : (guild?.acronym || guild?.name?.slice(0, 2)))}
  </span>
);

const ServerEntry = ({ guild, currentGuildId, onSelect, onContextMenu, onMouseEnter, onMouseLeave, draggable, onDragStart, onDragEnd, onDragEnter, onDragOver, onDrop, dropTarget = false, draggingSelf = false, compact = false }) => (
  <button
    type="button"
    className="app-rail-entry"
    data-selected={currentGuildId === guild.id}
    data-compact={compact ? 'true' : 'false'}
    data-drop-target={dropTarget ? 'true' : 'false'}
    data-dragging-self={draggingSelf ? 'true' : 'false'}
    draggable={draggable}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onDragEnter={onDragEnter}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onClick={() => onSelect(guild.id)}
    onContextMenu={onContextMenu}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    aria-label={guild.name}
  >
    <ServerAvatar guild={guild} />
  </button>
);

const FolderIcon = ({ folder, guilds, open }) => {
  const previews = folder.guildIds.slice(0, 4).map((id) => guilds.find((guild) => guild.id === id)).filter(Boolean);

  return (
    <span className="app-folder-avatar" style={{ '--folder-color': folder.color }}>
      <md-ripple />
      {previews.length > 1 ? (
        <span className="app-folder-grid">
          {previews.map((guild) => (
            <span key={guild.id} className="app-folder-mini">
              {guild.icon ? <img src={getProxyUrl(guild.icon)} draggable={false} alt="" /> : (guild.acronym || guild.name?.slice(0, 2))}
            </span>
          ))}
        </span>
      ) : open ? (
        <FaFolderOpen size={20} />
      ) : (
        <FaFolder size={20} />
      )}
    </span>
  );
};

const ServerList = ({ guilds, currentGuildId, onSelect, user, onSettings, onUserClick }) => {
  const [layout, setLayout] = useState(() => createDefaultLayout(guilds));
  const [loadedKey, setLoadedKey] = useState('');
  const [menu, setMenu] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const guildMap = useMemo(() => Object.fromEntries(guilds.map((guild) => [guild.id, guild])), [guilds]);

  useEffect(() => {
    setLayout(readLayout(user, guilds));
    setLoadedKey(layoutKey(user));
  }, [user?.id, guilds]);

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
    const folderId = `folder-${Date.now()}`;
    updateLayout((current) => ({
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
    }));
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

  const resetLayout = () => {
    updateLayout(createDefaultLayout(guilds));
    setMenu(null);
  };

  const createDragPreview = (entry) => {
    const preview = document.createElement('div');
    preview.className = 'app-drag-preview';

    if (entry.type === 'folder') {
      const folder = layout.folders[entry.id];
      preview.classList.add('folder');
      preview.style.setProperty('--folder-color', folder?.color || FOLDER_COLORS[0]);
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

  const dropOn = (target) => (e) => {
    e.preventDefault();
    try {
      moveEntry(JSON.parse(e.dataTransfer.getData('application/json')), target);
    } catch { }
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
          <ServerAvatar primary><FaDiscord size={24} /></ServerAvatar>
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
              style={{ '--folder-color': folder.color }}
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

        <button type="button" className="app-rail-entry" onMouseEnter={showTooltip('サーバーを作成または参加')} onMouseLeave={hideTooltip} aria-label="サーバーを作成または参加">
          <ServerAvatar><FaPlus size={18} /></ServerAvatar>
        </button>

        <button type="button" className="app-rail-entry" onMouseEnter={showTooltip('発見')} onMouseLeave={hideTooltip} aria-label="発見">
          <ServerAvatar><FaCompass size={18} /></ServerAvatar>
        </button>
      </div>

      <div className="h-0 relative z-[1]">
        <div className="absolute h-3 -mt-3 w-full bg-gradient-to-b from-transparent to-[var(--app-surface-container-high)]" />
      </div>

      <button
        type="button"
        className="app-rail-entry"
        onClick={() => onSettings?.()}
        onMouseEnter={showTooltip('設定')}
        onMouseLeave={hideTooltip}
        aria-label="設定"
      >
        <ServerAvatar><FaGear size={18} /></ServerAvatar>
      </button>

      {menu && (
        <ServerRailMenu
          menu={menu}
          layout={layout}
          guildMap={guildMap}
          onClose={() => setMenu(null)}
          onCreateFolder={createFolder}
          onMoveGuildToFolder={moveGuildToFolder}
          onRemoveGuildFromFolder={removeGuildFromFolder}
          onDissolveFolder={dissolveFolder}
          onRenameFolder={(folderId, name) => setFolder(folderId, { name })}
          onColorFolder={(folderId, color) => setFolder(folderId, { color })}
          onToggleFolder={(folderId) => setFolder(folderId, { collapsed: !layout.folders[folderId]?.collapsed })}
          onReset={resetLayout}
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

const ServerRailMenu = ({
  menu,
  layout,
  guildMap,
  onClose,
  onCreateFolder,
  onMoveGuildToFolder,
  onRemoveGuildFromFolder,
  onDissolveFolder,
  onRenameFolder,
  onColorFolder,
  onToggleFolder,
  onReset
}) => {
  const folder = menu.folderId ? layout.folders[menu.folderId] : null;
  const folders = Object.values(layout.folders);
  const movableFolders = folders.filter((targetFolder) => targetFolder.id !== menu.folderId);
  const x = Math.min(menu.x, window.innerWidth - 280);
  const y = Math.min(menu.y, window.innerHeight - 320);

  return (
    <>
      <div className="app-server-menu-scrim" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="app-server-menu" style={{ left: Math.max(8, x), top: Math.max(8, y) }} onClick={(e) => e.stopPropagation()}>
        {menu.type === 'guild' && (
          <>
            {!menu.folderId && <button type="button" onClick={() => onCreateFolder(menu.guildId)}>フォルダーを作成</button>}
            {movableFolders.length > 0 && <div className="app-server-menu-label">フォルダーへ移動</div>}
            {movableFolders.map((targetFolder) => (
              <button key={targetFolder.id} type="button" onClick={() => onMoveGuildToFolder(menu.guildId, targetFolder.id)}>
                <span className="app-menu-color" style={{ background: targetFolder.color }} />
                {targetFolder.name}
              </button>
            ))}
            {menu.folderId && <button type="button" onClick={() => onRemoveGuildFromFolder(menu.guildId, menu.folderId)}>フォルダーから削除</button>}
            <button type="button" onClick={onReset}>配置をリセット</button>
          </>
        )}

        {menu.type === 'folder' && folder && (
          <>
            <label className="app-server-menu-field">
              <span>フォルダー名</span>
              <input value={folder.name} onChange={(e) => onRenameFolder(folder.id, e.target.value)} />
            </label>
            <div className="app-server-menu-label">フォルダーの色</div>
            <div className="app-server-menu-colors">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="app-server-menu-swatch"
                  data-selected={folder.color === color}
                  style={{ background: color }}
                  onClick={() => onColorFolder(folder.id, color)}
                  title={color}
                />
              ))}
            </div>
            <button type="button" onClick={() => onToggleFolder(folder.id)}>{folder.collapsed ? 'フォルダーを開く' : 'フォルダーを閉じる'}</button>
            <button type="button" onClick={() => onDissolveFolder(folder.id)}>フォルダーを解除</button>
            <button type="button" onClick={onReset}>配置をリセット</button>
          </>
        )}
      </div>
    </>
  );
};

export default ServerList;
