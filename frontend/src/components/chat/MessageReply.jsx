import { FaFile } from 'react-icons/fa6';
import { getProxyUrl } from '../../utils/helpers';
import { useTwemoji } from '../../hooks/useTwemoji';

const clipReplyContent = (content = '') => {
  const flattened = content.replace(/\s+/g, ' ').trim();
  if (!flattened) return '';
  return flattened.length > 128 ? `${flattened.slice(0, 128)}...` : flattened;
};

const MessageReply = ({ message, mention = false, noDecorations = false, onClick }) => {
  const author = message?.author;
  const content = clipReplyContent(message?.content);
  const hasAttachments = message?.attachments?.length > 0;
  const hasStickers = message?.stickers?.length > 0;
  const { ref } = useTwemoji();

  return (
    <button
      type="button"
      className="app-reply"
      data-decorated={noDecorations ? 'false' : 'true'}
      onClick={onClick}
      disabled={!message || !onClick}
      title={message ? '返信元のメッセージへ移動' : 'メッセージを読み込めません'}
    >
      {!message || !onClick ? null : <md-ripple />}
      {!noDecorations && <span className="app-reply-hook" aria-hidden="true" />}
      {message ? (
        <>
          {author?.avatar && <img src={getProxyUrl(author.avatar)} alt="" className="app-reply-avatar" />}
          <span ref={ref} className="max-w-[180px] shrink-0 overflow-hidden whitespace-nowrap text-ellipsis font-semibold" style={{ color: author?.color && author.color !== '#000000' ? author.color : undefined }}>
            {mention ? '@' : ''}{author?.displayName || author?.username || '不明なユーザー'}
          </span>
          <span className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">
            {hasAttachments && (
              <span className="inline-flex items-center gap-1 mr-1 whitespace-nowrap italic">
                <FaFile size={13} />
                {message.attachments.length > 1 ? '複数の添付ファイル' : '添付ファイル'}
              </span>
            )}
            {hasStickers && !content && !hasAttachments ? (
              <span className="inline-flex items-center gap-1 mr-1 whitespace-nowrap italic">
                <FaFile size={13} />
                {message.stickers.length > 1 ? '複数のスタンプ' : 'スタンプ'}
              </span>
            ) : null}
            {content || (!hasAttachments && !hasStickers ? 'クリックして移動' : '')}
          </span>
        </>
      ) : (
        <span className="min-w-0 overflow-hidden whitespace-nowrap text-ellipsis">メッセージを読み込めません。クリックして移動</span>
      )}
    </button>
  );
};

export default MessageReply;
