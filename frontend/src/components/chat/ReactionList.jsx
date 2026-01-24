import React, { useRef, useEffect, useState } from 'react';
import Symbol from '../common/Symbol';
import { getProxyUrl } from '../../utils/helpers';
import TwemojiText from '../ui/TwemojiText';

const ReactionList = ({ reactions, onReactionClick, onAddReaction, socket, channelId, messageId }) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="app-reactions flex flex-wrap items-center gap-1 mt-1.5 isolate">
      {reactions.map((r) => {
        const reactionKey = r.emoji.id || r.emoji.name;
        return (
          <ReactionButton
            key={reactionKey}
            reaction={r}
            onReactionClick={onReactionClick}
            socket={socket}
            channelId={channelId}
            messageId={messageId}
          />
        );
      })}
      {onAddReaction && (
        <button
          type="button"
          className="app-reaction app-reaction-add"
          title="リアクションを追加"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddReaction(e); }}
        >
          <Symbol size={16}>add</Symbol>
        </button>
      )}
    </div>
  );
};

const ReactionButton = ({ reaction, onReactionClick, socket, channelId, messageId }) => {
  const r = reaction;
  const prevCountRef = useRef(r.count);
  const [animating, setAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [users, setUsers] = useState(null);
  const identifier = r.emoji.id ? `${r.emoji.name}:${r.emoji.id}` : r.emoji.name;

  useEffect(() => {
    if (prevCountRef.current !== r.count) {
      // カウント変化時のアニメーション開始
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      prevCountRef.current = r.count;
      return () => clearTimeout(timer);
    }
  }, [r.count]);

  // リアクションユーザーの一覧
  const loadUsers = () => {
    if (!socket || users !== null) return;
    socket.timeout(8000).emit('getReactionUsers', { channelId, messageId, emoji: identifier }, (err, result) => {
      if (!err && result?.ok) setUsers(result.users || []);
      else setUsers([]);
    });
  };

  const peopleText = (list) => {
    if (!list || list.length === 0) return '誰もリアクションしていません';
    const names = list.slice(0, 3).map((u) => u.displayName || u.username);
    const rest = list.length - names.length;
    return rest > 0 ? `${names.join('、')} ほか${rest}人` : `${names.join('、')} がリアクションしました`;
  };

  const renderEmoji = (emoji) => {
    if (emoji.id) {
      return <img src={getProxyUrl(emoji.url)} className="w-full h-full object-contain" alt={emoji.name} />;
    }
    return <TwemojiText className="flex items-center justify-center w-full h-full">{emoji.name}</TwemojiText>;
  };

  return (
    <span
      className="app-reaction-wrap"
      onMouseEnter={() => { setHovered(true); loadUsers(); }}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <span className="app-reaction-tooltip" role="tooltip">
          <span className="app-reaction-tooltip-emoji">{renderEmoji(r.emoji)}</span>
          <span className="app-reaction-tooltip-text">{peopleText(users)}</span>
        </span>
      )}
      <button
        onClick={(e) => {
          e.preventDefault(); e.stopPropagation();
          const emojiData = r.emoji.id ? { name: r.emoji.name, id: r.emoji.id } : r.emoji.name;
          onReactionClick(emojiData, !r.me);
        }}
        className="app-reaction"
        data-active={r.me}
      >
        <div className="flex items-center justify-center w-[1.2em] h-[1.2em] shrink-0 pointer-events-none">
          {renderEmoji(r.emoji)}
        </div>
        <span className="app-reaction-count">
          <span className={`inline-block ${animating ? 'reaction-count-spin' : ''}`}>
            {r.count}
          </span>
        </span>
      </button>
    </span>
  );
};

export default ReactionList;
