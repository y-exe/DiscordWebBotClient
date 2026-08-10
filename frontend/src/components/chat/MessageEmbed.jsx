import { getProxyUrl } from '../../utils/helpers';
import { safeExternalUrl, safeMediaUrl } from '../../utils/security';

const CUSTOM_EMOJI_RE = /<(a?):(\w+):(\d+)>/g;

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const encodeMentions = (content) => {
  if (!content) return '';
  let result = content;
  result = result.replace(/https:\/\/discord\.com\/channels\/(\d+|@me)\/(\d+)(?:\/\d+)?/g,
    (full, guildId, channelId) => `<mention data-type="channelLink" data-guild="${guildId}" data-channel="${channelId}">#link</mention>`);
  result = result.replace(/<#(\d+)>/g,
    (full, channelId) => `<mention data-type="channelMention" data-channel="${channelId}">#channel</mention>`);
  result = result.replace(/<@&(\d+)>/g,
    (full, roleId) => `<mention data-type="roleMention" data-role="${roleId}">@role</mention>`);
  result = result.replace(/<@!?(\d+)>/g,
    (full, userId) => `<mention data-type="userMention" data-user="${userId}">@user</mention>`);
  result = result.replace(/@everyone|@here/g,
    (full) => `<mention data-type="specialMention" data-text="${full === '@everyone' ? 'everyone' : 'here'}">@${full === '@everyone' ? 'everyone' : 'here'}</mention>`);
  result = result.replace(/^-# (.+)$/gm,
    (full, text) => `<mention data-type="subtext">${escapeHtml(text)}</mention>`);
  return result;
};

const parseCustomEmojis = (text) => {
  if (!text || typeof text !== 'string') return text;
  const parts = [];
  let lastIndex = 0;
  let match;
  const re = new RegExp(CUSTOM_EMOJI_RE.source, 'g');
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const isAnimated = match[1] === 'a';
    const name = match[2];
    const id = match[3];
    const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}?size=48`;
    parts.push(
      <img key={`e-${id}-${match.index}`} src={getProxyUrl(url)} alt={`:${name}:`} className="custom-emoji inline-block h-[1.2em] align-[-0.2em]" />
    );
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : text;
};

const MentionPill = ({ children, className = '' }) => (
  <span className={`mention-pill ${className}`}>{children}</span>
);

const SafeImage = ({ src, ...props }) => {
  const safeSrc = safeMediaUrl(src);
  return safeSrc ? <img src={getProxyUrl(safeSrc)} {...props} /> : null;
};

const MentionInline = ({ 'data-type': type, 'data-guild': guildId, 'data-channel': channelId, 'data-role': roleId, 'data-user': userId, 'data-text': text, children, channels, guildRoles, navigate }) => {
  switch (type) {
    case 'channelLink': {
      const ch = channels?.find(c => c.id === channelId);
      const name = ch?.name || channelId;
      return (
        <MentionPill className="mention-channel">
          <span className="mention-icon">#</span>
          <span className="mention-text" onClick={(e) => { e.stopPropagation(); navigate?.(`/${guildId}/${channelId}`); }}>{name}</span>
        </MentionPill>
      );
    }
    case 'channelMention': {
      const ch = channels?.find(c => c.id === channelId);
      const name = ch?.name || channelId;
      return (
        <MentionPill className="mention-channel">
          <span className="mention-icon">#</span>
          <span className="mention-text">{name}</span>
        </MentionPill>
      );
    }
    case 'roleMention': {
      const role = guildRoles?.find(r => r.id === roleId);
      const name = role?.name || roleId;
      const color = role?.color && role.color !== '#000000' ? role.color : null;
      return (
        <MentionPill className="mention-role">
          <span className="mention-role-dot" style={{ background: color || '#99aab5' }} />
          <span className="mention-text" style={{ color: color || 'inherit' }}>{name}</span>
        </MentionPill>
      );
    }
    case 'userMention':
      return (
        <MentionPill className="mention-user">
          <span className="mention-icon">@</span>
          <span className="mention-text">{userId}</span>
        </MentionPill>
      );
    case 'specialMention':
      return (
        <MentionPill className="mention-special">
          <span className="mention-icon">@</span>
          <span className="mention-text">{text}</span>
        </MentionPill>
      );
    case 'subtext':
      return <span className="text-xs text-[#a3a6aa]">{children}</span>;
    default:
      return null;
  }
};

const MessageEmbed = ({ embed, onImageClick, channels, guildRoles, guildId, navigate }) => {
  if (!embed) return null;

  const embedColor = typeof embed.color === 'number'
    ? `#${Math.max(0, Math.min(0xffffff, embed.color)).toString(16).padStart(6, '0')}`
    : (/^#[0-9a-f]{6}$/i.test(embed.color || '') ? embed.color : '#1e1f22');
  const embedUrl = safeExternalUrl(embed.url);

  const renderText = (text) => {
    if (!text) return text;
    const encoded = encodeMentions(text);
    if (!encoded.includes('<mention')) {
      return parseCustomEmojis(text);
    }
    const parts = [];
    const mentionRe = /<mention[^>]*>.*?<\/mention>|([^<]+)/g;
    let m;
    let key = 0;
    while ((m = mentionRe.exec(encoded)) !== null) {
      if (m[1]) {
        const parsed = parseCustomEmojis(m[1]);
        parts.push(typeof parsed === 'string' ? parsed : <span key={key++}>{parsed}</span>);
      } else {
        const tag = m[0];
        const typeMatch = tag.match(/data-type="([^"]+)"/);
        const type = typeMatch?.[1];
        const innerMatch = tag.match(/>(.*?)<\/mention>/);
        const inner = innerMatch?.[1] || '';
        if (type === 'subtext') {
          parts.push(<span key={key++} className="text-xs text-[#a3a6aa]">{inner}</span>);
        } else {
          const props = {};
          const guildMatch = tag.match(/data-guild="([^"]+)"/);
          const channelMatch = tag.match(/data-channel="([^"]+)"/);
          const roleMatch = tag.match(/data-role="([^"]+)"/);
          const userMatch = tag.match(/data-user="([^"]+)"/);
          const textMatch = tag.match(/data-text="([^"]+)"/);
          if (guildMatch) props['data-guild'] = guildMatch[1];
          if (channelMatch) props['data-channel'] = channelMatch[1];
          if (roleMatch) props['data-role'] = roleMatch[1];
          if (userMatch) props['data-user'] = userMatch[1];
          if (textMatch) props['data-text'] = textMatch[1];
          parts.push(<MentionInline key={key++} data-type={type} {...props} channels={channels} guildRoles={guildRoles} navigate={navigate} />);
        }
      }
    }
    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="border-l-4 bg-[#1e1f22] rounded-r p-3 mt-2 max-w-[520px] grid gap-2" style={{ borderColor: embedColor }}>
      <div className="grid gap-1">
        {embed.provider && <div className="text-xs text-discord-muted">{embed.provider.name}</div>}
        {embed.author && (
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            {(embed.author.iconURL || embed.author.icon_url) && <SafeImage src={embed.author.iconURL || embed.author.icon_url} className="w-6 h-6 rounded-full" alt="" />}
            <span>{renderText(embed.author.name)}</span>
          </div>
        )}
        {embed.title && (
          <div className="font-bold text-[#00a8fc] hover:underline cursor-pointer">
            {embedUrl ? <a href={embedUrl} target="_blank" rel="noopener noreferrer">{renderText(embed.title)}</a> : renderText(embed.title)}
          </div>
        )}
        {embed.description && <div className="text-sm text-[#dcddde]">{renderText(embed.description)}</div>}
        {embed.fields && embed.fields.length > 0 && (
          <div className="grid grid-cols-12 gap-2 mt-1">
            {embed.fields.map((f, i) => (
              <div key={i} className={`${f.inline ? 'col-span-4' : 'col-span-12'}`}>
                <div className="text-xs font-bold text-discord-muted">{renderText(f.name)}</div>
                <div className="text-sm text-discord-text whitespace-pre-wrap">{renderText(f.value)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-4">
        {embed.thumbnail && <SafeImage src={embed.thumbnail.url} className="rounded max-w-[80px] max-h-[80px] object-cover cursor-pointer" alt="" onClick={(e) => { e.stopPropagation(); const url = safeMediaUrl(embed.thumbnail.url); if (url) onImageClick(url); }} />}
        {embed.image && <SafeImage src={embed.image.url} className="rounded max-w-full max-h-[300px] object-contain cursor-pointer" alt="" onClick={(e) => { e.stopPropagation(); const url = safeMediaUrl(embed.image.url); if (url) onImageClick(url); }} />}
      </div>
      {(embed.footer || embed.timestamp) && (
        <div className="text-xs text-discord-muted flex items-center gap-2 mt-1">
          {(embed.footer?.iconURL || embed.footer?.icon_url) && <SafeImage src={embed.footer.iconURL || embed.footer.icon_url} className="w-4 h-4 rounded-full" alt="" />}
          <span>{renderText(embed.footer?.text)}{embed.footer && embed.timestamp && " ・ "}{embed.timestamp && new Date(embed.timestamp).toLocaleString('ja-JP')}</span>
        </div>
      )}
    </div>
  );
};

export default MessageEmbed;
