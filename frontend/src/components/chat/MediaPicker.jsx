import { useMemo, useState } from 'react';
import { FaNoteSticky } from 'react-icons/fa6';
import { DEFAULT_EMOJIS } from '../../utils/emojis';
import { getProxyUrl } from '../../utils/helpers';
import { getStickerUrl, isLottieSticker } from '../../utils/stickers';
import TwemojiText from '../ui/TwemojiText';

const CATEGORY_LABELS = {
  people: '顔文字と人',
  nature: '動物と自然',
  food: '食べ物',
  activity: 'アクティビティ',
  travel: '旅行と場所',
  objects: '物',
  symbols: '記号',
  flags: '旗',
};

const MediaPicker = ({ mode = 'emoji', currentGuild, guildEmojis = [], guildStickers = [], onEmoji, onSticker, onClose }) => {
  const [tab, setTab] = useState(mode);

  return (
    <div className="app-media-picker" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div className="app-media-tabs">
        <PickerTab active={tab === 'sticker'} edge="start" onClick={() => setTab('sticker')}>
          スタンプ
        </PickerTab>
        <PickerTab active={tab === 'emoji'} edge="end" onClick={() => setTab('emoji')}>
          絵文字
        </PickerTab>
      </div>
      {tab === 'emoji' ? (
        <EmojiPicker currentGuild={currentGuild} guildEmojis={guildEmojis} onEmoji={(emoji) => { onEmoji?.(emoji); onClose?.(); }} />
      ) : (
        <StickerPicker guildStickers={guildStickers} onSticker={(sticker) => { onSticker?.(sticker); onClose?.(); }} />
      )}
    </div>
  );
};

const PickerTab = ({ active, edge, children, onClick }) => {
  const MaterialButton = active ? 'md-filled-button' : 'md-filled-tonal-button';
  return (
    <MaterialButton type="button" class="app-media-tab" data-edge={edge} data-active={active ? 'true' : 'false'} onClick={onClick}>
      <span>{children}</span>
    </MaterialButton>
  );
};

const EmojiPicker = ({ currentGuild, guildEmojis, onEmoji }) => {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();

  const serverItems = useMemo(() => {
    return (guildEmojis || []).filter((emoji) => {
      if (!normalized) return true;
      return emoji.name?.toLowerCase().includes(normalized);
    });
  }, [guildEmojis, normalized]);

  const emojiSections = useMemo(() => {
    return Object.entries(DEFAULT_EMOJIS).map(([category, emojis]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      emojis: (emojis || []).filter((emoji) => !query || emoji.includes(query))
    })).filter((section) => section.emojis.length > 0);
  }, [normalized, query]);

  return (
    <div className="app-picker-panel">
      <SearchField value={query} onChange={setQuery} placeholder="絵文字を検索..." />
      <div className="app-picker-scroll no-scrollbar">
        {serverItems.length > 0 && (
          <>
            <PickerHeader icon={currentGuild?.icon} fallback={currentGuild?.acronym || currentGuild?.name?.slice(0, 2)}>
              {currentGuild?.name || 'サーバー'}
            </PickerHeader>
            <div className="app-emoji-grid">
              {serverItems.map((emoji) => (
                <button type="button" key={emoji.id} className="app-emoji-option" onClick={() => onEmoji({ name: emoji.name, id: emoji.id })} title={emoji.name}>
                  <md-ripple />
                  <img src={getProxyUrl(emoji.url)} alt={emoji.name} />
                </button>
              ))}
            </div>
          </>
        )}
        {emojiSections.map((section) => (
          <section key={section.category} className="app-emoji-section">
            <PickerHeader>{section.label}</PickerHeader>
            <div className="app-emoji-grid">
              {section.emojis.map((emoji, index) => (
                <button type="button" key={`${section.category}-${emoji}-${index}`} className="app-emoji-option" onClick={() => onEmoji(emoji)} title={emoji}>
                  <md-ripple />
                  <TwemojiText>{emoji}</TwemojiText>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const StickerPicker = ({ guildStickers = [], onSticker }) => {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const stickers = useMemo(() => {
    return (guildStickers || []).filter((sticker) => {
      if (!normalized) return true;
      return [sticker.name, sticker.description, ...(sticker.tags || [])]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [guildStickers, normalized]);

  return (
    <div className="app-picker-panel">
      <SearchField value={query} onChange={setQuery} placeholder="スタンプを検索..." />
      <div className="app-picker-scroll no-scrollbar">
        {stickers.length === 0 ? (
          <div className="app-sticker-empty">
            <FaNoteSticky size={22} />
            <span>利用できるスタンプがありません</span>
          </div>
        ) : (
          <div className="app-sticker-picker-grid">
            {stickers.map((sticker) => (
              <button type="button" key={sticker.id} className="app-sticker-option" onClick={() => onSticker(sticker)} title={sticker.name}>
                <md-ripple />
                {isLottieSticker(sticker) ? (
                  <span className="app-sticker-option-fallback">{sticker.name}</span>
                ) : (
                  <img src={getProxyUrl(getStickerUrl(sticker))} alt={sticker.name} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SearchField = ({ value, onChange, placeholder }) => (
  <md-filled-text-field class="app-picker-search" value={value} placeholder={placeholder} onInput={(e) => onChange(e.currentTarget.value)} autoFocus />
);

const PickerHeader = ({ children, icon, fallback }) => (
  <div className="app-picker-header">
    {icon ? (
      <img className="app-picker-header-avatar" src={getProxyUrl(icon)} alt="" />
    ) : fallback ? (
      <span className="app-picker-header-avatar app-picker-header-avatar--fallback">{fallback}</span>
    ) : null}
    <span>{children}</span>
  </div>
);

export default MediaPicker;
