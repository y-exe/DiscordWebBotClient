import { useMemo, useRef, useState } from 'react';
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

const MediaPicker = ({ mode = 'emoji', currentGuild, guildEmojis = [], emojiGroups = [], guildStickers = [], onEmoji, onSticker, onClose }) => {
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
        <EmojiPicker currentGuild={currentGuild} guildEmojis={guildEmojis} emojiGroups={emojiGroups} onEmoji={(emoji) => { onEmoji?.(emoji); onClose?.(); }} />
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

const EmojiPicker = ({ currentGuild, guildEmojis, emojiGroups, onEmoji }) => {
  const [query, setQuery] = useState('');
  const [hovered, setHovered] = useState(null);
  const normalized = query.trim().toLowerCase();
  const sectionRefs = useRef({});

  // 全サーバーの絵文字グループ(未取得時は現サーバーのみ)
  const groups = useMemo(() => {
    if (emojiGroups?.length) return emojiGroups;
    if (guildEmojis?.length && currentGuild) {
      return [{ guildId: currentGuild.id, guildName: currentGuild.name, guildIcon: currentGuild.icon, emojis: guildEmojis }];
    }
    return [];
  }, [emojiGroups, guildEmojis, currentGuild]);

  const filteredGroups = useMemo(() => {
    if (!normalized) return groups;
    return groups.map((group) => ({
      ...group,
      emojis: group.emojis.filter((emoji) => emoji.name?.toLowerCase().includes(normalized)),
    })).filter((group) => group.emojis.length > 0);
  }, [groups, normalized]);

  const emojiSections = useMemo(() => {
    return Object.entries(DEFAULT_EMOJIS).map(([category, emojis]) => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      emojis: (emojis || []).filter((emoji) => !query || emoji.includes(query))
    })).filter((section) => section.emojis.length > 0);
  }, [normalized, query]);

  const scrollToGroup = (guildId) => {
    sectionRefs.current[guildId]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  return (
    <div className="app-picker-panel">
      <SearchField value={query} onChange={setQuery} placeholder="絵文字を検索..." />
      <div className="app-picker-body">
        {/* for-web: サーバーレール */}
        {groups.length > 0 && (
          <div className="app-emoji-rail no-scrollbar">
            {groups.map((group) => (
              <button
                key={group.guildId}
                type="button"
                className="app-emoji-rail-item"
                title={group.guildName}
                onClick={() => scrollToGroup(group.guildId)}
              >
                {group.guildIcon
                  ? <img src={getProxyUrl(group.guildIcon)} alt="" />
                  : <span>{(group.guildName || '?').slice(0, 2)}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="app-picker-scroll no-scrollbar">
          {filteredGroups.map((group) => (
            <section key={group.guildId} ref={(el) => { sectionRefs.current[group.guildId] = el; }} className="app-emoji-section">
              <PickerHeader icon={group.guildIcon} fallback={(group.guildName || '?').slice(0, 2)}>
                {group.guildName || 'サーバー'}
              </PickerHeader>
              <div className="app-emoji-grid">
                {group.emojis.map((emoji) => (
                  <button
                    type="button"
                    key={emoji.id}
                    className="app-emoji-option"
                    onClick={() => onEmoji({ name: emoji.name, id: emoji.id })}
                    onMouseEnter={() => setHovered({ type: 'custom', emoji, groupName: group.guildName, groupIcon: group.guildIcon })}
                    title={emoji.name}
                  >
                    <md-ripple />
                    <img src={getProxyUrl(emoji.url)} alt={emoji.name} />
                  </button>
                ))}
              </div>
            </section>
          ))}
          {emojiSections.map((section) => (
            <section key={section.category} className="app-emoji-section">
              <PickerHeader>{section.label}</PickerHeader>
              <div className="app-emoji-grid">
                {section.emojis.map((emoji, index) => (
                  <button
                    type="button"
                    key={`${section.category}-${emoji}-${index}`}
                    className="app-emoji-option"
                    onClick={() => onEmoji(emoji)}
                    onMouseEnter={() => setHovered({ type: 'unicode', emoji, label: section.label })}
                    title={emoji}
                  >
                    <md-ripple />
                    <TwemojiText>{emoji}</TwemojiText>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      {/* for-web EmojiPreviewBar */}
      <div className="app-emoji-preview">
        {hovered ? (
          <>
            <span className="app-emoji-preview-emoji">
              {hovered.type === 'custom'
                ? <img src={getProxyUrl(hovered.emoji.url)} alt="" />
                : <TwemojiText>{hovered.emoji}</TwemojiText>}
            </span>
            <span className="app-emoji-preview-text">
              <span className="app-emoji-preview-name">
                :{hovered.type === 'custom' ? hovered.emoji.name : hovered.label}:
              </span>
              {hovered.type === 'custom' && (
                <span className="app-emoji-preview-from">from <strong>{hovered.groupName || 'サーバー'}</strong></span>
              )}
            </span>
            {hovered.type === 'custom' && hovered.groupIcon && (
              <img className="app-emoji-preview-server" src={getProxyUrl(hovered.groupIcon)} alt="" />
            )}
          </>
        ) : null}
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
