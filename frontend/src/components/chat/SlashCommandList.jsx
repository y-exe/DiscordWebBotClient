import { useState, useEffect, useRef } from 'react';

const COMMAND_TYPES = {
  1: 'CHAT_INPUT',
  2: 'USER',
  3: 'MESSAGE',
};

const OPTION_TYPES = {
  1: 'SUB_COMMAND',
  2: 'SUB_COMMAND_GROUP',
  3: 'STRING',
  4: 'INTEGER',
  5: 'BOOLEAN',
  6: 'USER',
  7: 'CHANNEL',
  8: 'ROLE',
  9: 'MENTIONABLE',
  10: 'NUMBER',
  11: 'ATTACHMENT',
};

const SlashCommandList = ({ commands, onSelect, onClose }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef(null);

  const filteredCommands = commands.filter(cmd => cmd.type === 1 || cmd.type === 'CHAT_INPUT' || !cmd.type);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIdx(0);
  }, [filteredCommands.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIdx]) {
          onSelect(filteredCommands[selectedIdx]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIdx, filteredCommands, onSelect, onClose]);

  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIdx];
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIdx]);

  if (filteredCommands.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 max-h-80 overflow-y-auto rounded-xl bg-[var(--app-surface-container-high)] shadow-lg">
        <div className="p-3 text-sm text-[var(--app-on-surface-variant)]">
          コマンドが見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 max-h-80 overflow-y-auto rounded-xl bg-[var(--app-surface-container-high)] shadow-lg">
      <div ref={listRef}>
        {filteredCommands.map((cmd, idx) => (
          <button
            key={cmd.id}
            type="button"
            className={`w-full px-3 py-2 text-left transition-colors ${idx === selectedIdx ? 'bg-[var(--app-primary-container)]' : 'hover:bg-[var(--app-surface-container-highest)]'}`}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIdx(idx)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[var(--app-on-surface)] font-medium">/{cmd.name}</span>
              {cmd.description && (
                <span className="text-xs text-[var(--app-on-surface-variant)] truncate">{cmd.description}</span>
              )}
            </div>
            {cmd.options && cmd.options.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {cmd.options.filter(opt => opt.type !== 1 && opt.type !== 2).map((opt) => (
                  <span
                    key={opt.name}
                    className={`text-xs px-1.5 py-0.5 rounded ${opt.required ? 'bg-[var(--app-primary-container)] text-[var(--app-on-primary-container)]' : 'bg-[var(--app-surface-container-highest)] text-[var(--app-on-surface-variant)]'}`}
                  >
                    {opt.name}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SlashCommandList;
