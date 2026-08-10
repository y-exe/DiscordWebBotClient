import React, { useRef, useEffect, useState } from 'react';
import { getProxyUrl } from '../../utils/helpers';
import TwemojiText from '../ui/TwemojiText';

const ReactionList = ({ reactions, onReactionClick }) => {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 isolate">
      {reactions.map((r) => {
        const reactionKey = r.emoji.id || r.emoji.name;
        return (
          <ReactionButton
            key={reactionKey}
            reaction={r}
            onReactionClick={onReactionClick}
          />
        );
      })}
    </div>
  );
};

const ReactionButton = ({ reaction, onReactionClick }) => {
  const r = reaction;
  const reactionKey = r.emoji.id || r.emoji.name;
  const prevCountRef = useRef(r.count);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (prevCountRef.current !== r.count) {
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 300);
      prevCountRef.current = r.count;
      return () => clearTimeout(timer);
    }
  }, [r.count]);

  const renderEmoji = (emoji) => {
    if (emoji.id) {
      return <img src={getProxyUrl(emoji.url)} className="w-full h-full object-contain" alt={emoji.name} />;
    }
    return <TwemojiText className="flex items-center justify-center w-full h-full">{emoji.name}</TwemojiText>;
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        const emojiData = r.emoji.id ? { name: r.emoji.name, id: r.emoji.id } : r.emoji.name;
        onReactionClick(emojiData, !r.me);
      }}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-[8px] border min-h-[32px]
        transition-all select-none cursor-pointer active:scale-95 outline-none
        ${r.me
          ? 'bg-[#1a1d40] border-[#5764f2] hover:bg-[#252a5a]'
          : 'bg-[#19191c] border-transparent hover:bg-[#2a2a2e] hover:border-[#313235]'
        }
      `}
    >
      <div className="flex items-center justify-center w-[16px] h-[16px] shrink-0 pointer-events-none">
        {renderEmoji(r.emoji)}
      </div>
      <span className={`text-[13px] font-bold ${r.me ? 'text-[#a3b4ff]' : 'text-[#9b9ca3]'}`}>
        <span className={`inline-block ${animating ? 'reaction-count-spin' : ''}`}>
          {r.count}
        </span>
      </span>
    </button>
  );
};

export default ReactionList;
