import Symbol from '../common/Symbol';

import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';

const TooltipContent = ({ text }) => {
  const { ref } = useTwemoji();
  return <span ref={ref}>{text}</span>;
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

  // 開時はアイコンのみ、閉時はサーバーミニアバター
  if (!open && previews.length > 0) {
    return (
      <span className="app-folder-avatar" data-preview="true">
        <md-ripple />
        <span
          className="app-folder-preview"
          data-size={previews.length > 2 ? 'small' : 'normal'}
          style={folder.color ? { background: `color-mix(in srgb, ${folder.color} 30%, transparent)` } : undefined}
        >
          {previews.map((guild) => (
            <span key={guild.id} className="app-folder-mini">
              {guild.icon ? <img src={getProxyUrl(guild.icon)} draggable={false} alt="" /> : (guild.acronym || guild.name?.slice(0, 2))}
            </span>
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className="app-folder-avatar" style={folder.color ? { color: folder.color, fill: folder.color } : undefined}>
      <md-ripple />
      <Symbol size={24} fill>folder_open</Symbol>
    </span>
  );
};

export { TooltipContent, ServerAvatar, ServerEntry, FolderIcon };