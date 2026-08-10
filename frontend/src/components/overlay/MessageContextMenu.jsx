import { useEffect, useMemo, useState } from 'react';
import { FaCopy, FaHashtag, FaLink, FaPen, FaPlus, FaReply, FaTrash } from 'react-icons/fa6';
import TwemojiText from '../ui/TwemojiText';

const cp = (...points) => String.fromCodePoint(...points);
const DEFAULT_EMOJIS = [cp(0x1f44d), cp(0x2705), cp(0x1f495), cp(0x1f914)];

const MessageContextMenu = ({
  x,
  y,
  message,
  currentUser,
  onClose,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  onReactionOpen
}) => {
  const [frequentEmojis, setFrequentEmojis] = useState(DEFAULT_EMOJIS);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('frequentEmojis') || '[]');
      if (Array.isArray(parsed) && parsed.length) setFrequentEmojis(parsed.slice(0, 4));
    } catch (e) { }
  }, []);

  const position = useMemo(() => {
    const width = 232;
    const height = message.author.id === currentUser?.id ? 352 : 296;
    return {
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8))
    };
  }, [currentUser?.id, message.author.id, x, y]);

  const isMe = message.author.id === currentUser?.id;

  const react = (emoji) => {
    onReaction(message.id, emoji, true);
    onClose();
  };

  return (
    <>
      <div className="app-menu-scrim" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div className="app-context-menu" style={position} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <div className="app-context-quick">
          {frequentEmojis.map((emoji) => (
            <button type="button" key={emoji} className="app-context-emoji" onClick={() => react(emoji)} title={emoji}>
              <md-ripple />
              <TwemojiText>{emoji}</TwemojiText>
            </button>
          ))}
        </div>

        <md-list class="app-context-list">
          <ContextDivider />
          <ContextItem label="リアクションを付ける" icon={<FaPlus />} actionIcon={<span className="app-context-chevron">&rsaquo;</span>} onClick={(e) => { onReactionOpen?.(e, message.id); onClose(); }} />
          <ContextItem label="返信" icon={<FaReply />} onClick={() => { onReply(message); onClose(); }} />
          {isMe && <ContextItem label="メッセージを編集" icon={<FaPen />} onClick={() => { onEdit?.(message); onClose(); }} />}
          {isMe && (
            <>
              <ContextDivider />
              <ContextItem destructive label="メッセージを削除" icon={<FaTrash />} onClick={() => { onDelete(message.id); onClose(); }} />
            </>
          )}
          <ContextDivider />
          <ContextItem label="テキストをコピー" icon={<FaCopy />} onClick={() => { navigator.clipboard.writeText(message.content || ''); onClose(); }} />
          <ContextItem label="メッセージリンクをコピー" icon={<FaLink />} onClick={() => { navigator.clipboard.writeText(`https://discord.com/channels/@me/${message.channelId}/${message.id}`); onClose(); }} />
          <ContextItem label="メッセージIDをコピー" icon={<FaHashtag />} onClick={() => { navigator.clipboard.writeText(message.id); onClose(); }} />
        </md-list>
      </div>
    </>
  );
};

const ContextDivider = () => <div className="app-context-divider" />;

const ContextItem = ({ label, icon, actionIcon, destructive = false, onClick }) => (
  <md-list-item type="button" class="app-context-item" data-destructive={destructive ? 'true' : 'false'} onClick={onClick}>
    <span slot="start" className="app-context-leading">{icon}</span>
    <span className="app-context-label">{label}</span>
    {actionIcon && <span slot="end" className="app-context-trailing">{actionIcon}</span>}
  </md-list-item>
);

export default MessageContextMenu;
