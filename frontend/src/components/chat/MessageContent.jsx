import { useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';
import { safeExternalUrl } from '../../utils/security';

const CUSTOM_EMOJI_RE = /<(a?):(\w+):(\d+)>/g;

const messageSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []).filter((tag) => tag !== 'img'), 'mention'],
  attributes: {
    ...defaultSchema.attributes,
    mention: ['dataType', 'dataGuild', 'dataChannel', 'dataRole', 'dataUser', 'dataText'],
  },
};

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

const MentionPill = ({ children, className = '' }) => (
  <span className={`mention-pill ${className}`}>{children}</span>
);

const MentionComponent = ({ 'data-type': type, 'data-guild': guildId, 'data-channel': channelId, 'data-role': roleId, 'data-user': userId, 'data-text': text, children, channels, guildRoles, guildId: currentGuildId, navigate }) => {
  switch (type) {
    case 'channelLink': {
      const ch = channels?.find(c => c.id === channelId);
      const name = ch?.name || channelId;
      return (
        <MentionPill className="mention-channel">
          <span className="mention-icon">#</span>
          <span className="mention-text" onClick={(e) => { e.stopPropagation(); navigate(`/${guildId}/${channelId}`); }}>{name}</span>
        </MentionPill>
      );
    }
    case 'channelMention': {
      const ch = channels?.find(c => c.id === channelId);
      const name = ch?.name || channelId;
      return (
        <MentionPill className="mention-channel">
          <span className="mention-icon">#</span>
          <span className="mention-text" onClick={(e) => { e.stopPropagation(); navigate(`/${currentGuildId}/${channelId}`); }}>{name}</span>
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

const MessageContent = ({ content, channels, guildRoles, guildId, navigate }) => {
  const { ref, apply } = useTwemoji();

  const encoded = useMemo(() => encodeMentions(content || ''), [content]);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new MutationObserver(() => apply());
    observer.observe(ref.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const mentionProps = useMemo(() => ({ channels, guildRoles, guildId, navigate }), [channels, guildRoles, guildId, navigate]);

  return (
    <div ref={ref} className="app-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, messageSchema]]}
        components={{
          mention: (props) => <MentionComponent {...props} {...mentionProps} />,
          p: ({ children }) => {
            const processed = Array.isArray(children)
              ? children.map(c => typeof c === 'string' ? parseCustomEmojis(c) : c)
              : typeof children === 'string' ? parseCustomEmojis(children) : children;
            return <p className="m-0 inline">{processed}</p>;
          },
          a: ({ href, ...props }) => {
            const safeHref = safeExternalUrl(href);
            return safeHref ? <a {...props} href={safeHref} className="text-[#00a8fc] hover:underline cursor-pointer" target="_blank" rel="noopener noreferrer" /> : <span {...props} />;
          },
          code: ({ inline, ...props }) => inline
            ? <code {...props} className="app-code-inline" />
            : <code {...props} className="app-code-block" />,
          blockquote: (props) => <blockquote {...props} className="app-blockquote" />,
          h1: ({ children }) => <h1 className="text-2xl font-bold m-0 leading-tight">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold m-0 leading-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold m-0 leading-tight">{children}</h3>,
        }}
      >
        {encoded}
      </ReactMarkdown>
    </div>
  );
};

export default MessageContent;
