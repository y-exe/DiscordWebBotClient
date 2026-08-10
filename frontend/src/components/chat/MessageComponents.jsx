import { useState } from 'react';
import { openExternalUrl, safeExternalUrl } from '../../utils/security';

const BUTTON_STYLES = {
  1: 'bg-[#5865F2] text-white hover:brightness-110',
  2: 'bg-[#4E5058] text-white hover:brightness-110',
  3: 'bg-[#248046] text-white hover:brightness-110',
  4: 'bg-[#D83C3E] text-white hover:brightness-110',
  5: 'bg-[#4E5058] text-[#00aff4] hover:brightness-110 p-0',
};

const MessageComponents = ({ components, channelId, messageId, guildId, socket, onModal }) => {
  const [loading, setLoading] = useState(null);

  if (!components || components.length === 0) return null;

  const handleInteraction = async (component) => {
    if (component.type === 2 && component.custom_id) {
      if (component.style === 5 && component.url) {
        openExternalUrl(component.url);
        return;
      }

      setLoading(component.custom_id);

      socket?.emit('interaction', {
        type: 'button',
        customId: component.custom_id,
        channelId,
        messageId,
        guildId,
      }, (response) => {
        setLoading(null);
        if (response?.modal) {
          onModal?.(response.modal);
        }
        if (response?.error) {
          console.error('Interaction error:', response.error);
        }
      });
    }
    if (component.type === 3 && component.custom_id) {
      setLoading(component.custom_id);
      socket?.emit('interaction', {
        type: 'select',
        customId: component.custom_id,
        channelId,
        messageId,
        guildId,
        values: [],
      }, (response) => {
        setLoading(null);
        if (response?.modal) {
          onModal?.(response.modal);
        }
      });
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      {components.map((row, rowIdx) => {
        if (row.type === 1 && row.components) {
          return (
            <div key={rowIdx} className="flex flex-wrap gap-2">
              {row.components.map((comp, compIdx) => (
                <ButtonComponent
                  key={comp.custom_id || compIdx}
                  component={comp}
                  onClick={() => handleInteraction(comp)}
                  loading={loading === comp.custom_id}
                />
              ))}
            </div>
          );
        }
        if (row.type === 2) {
          return <ButtonComponent key={rowIdx} component={row} onClick={() => handleInteraction(row)} loading={loading === row.custom_id} />;
        }
        if (row.type === 3) {
          return <SelectComponent key={rowIdx} component={row} onChange={(values) => handleInteraction({ ...row, values })} />;
        }
        return null;
      })}
    </div>
  );
};

const ButtonComponent = ({ component, onClick, loading }) => {
  const { style, label, emoji, disabled, custom_id, url } = component;
  const isLink = style === 5 || !!url;

  if (isLink) {
    const safeUrl = safeExternalUrl(url);
    if (!safeUrl) return null;
    return (
      <a
        href={safeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity ${BUTTON_STYLES[style] || BUTTON_STYLES[3]}`}
      >
        {emoji && <ButtonEmoji emoji={emoji} />}
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${BUTTON_STYLES[style] || BUTTON_STYLES[3]} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${loading ? 'opacity-60' : ''}`}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {emoji && !loading && <ButtonEmoji emoji={emoji} />}
      {label}
    </button>
  );
};

const ButtonEmoji = ({ emoji }) => {
  if (!emoji) return null;
  if (emoji.id) {
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=20`}
        alt={emoji.name}
        className="w-5 h-5"
      />
    );
  }
  return <span>{emoji.name}</span>;
};

const SelectComponent = ({ component, onChange }) => {
  const { placeholder, options, disabled, custom_id } = component;

  return (
    <select
      disabled={disabled}
      onChange={(e) => {
        const values = Array.from(e.target.selectedOptions).map(opt => opt.value);
        onChange(values);
      }}
      className="px-3 py-2 rounded-lg bg-[var(--app-surface-container-highest)] text-[var(--app-on-surface)] border border-[var(--app-outline)] text-sm min-w-[200px]"
    >
      <option value="" disabled>{placeholder || '選択してください'}</option>
      {(options || []).map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}{opt.description ? ` - ${opt.description}` : ''}
        </option>
      ))}
    </select>
  );
};

export default MessageComponents;
