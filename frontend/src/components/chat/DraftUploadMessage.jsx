import MessageContent from './MessageContent';
import { getProxyUrl } from '../../utils/helpers';

const DraftUploadMessage = ({ draft, user, channels, roles, usersById, guildId, navigate, guilds, onContextMenu }) => {
    if (!draft) return null;
    const statusText = draft.status === 'failed' ? '送信に失敗しました' : '送信中...';

    return (
        <article className="app-message app-draft-message" data-status={draft.status} onContextMenu={onContextMenu}>
            <div className="app-message-row">
                <img src={getProxyUrl(user?.avatar)} className="app-message-avatar" alt="" />
                <div className="app-message-body">
                    <div className="app-message-meta">
                        <span className="app-message-author">{user?.displayName || user?.globalName || user?.username || '自分'}</span>
                        <span className="app-message-time">{statusText}</span>
                    </div>
                    <div className="app-message-content">
                        {draft.content && <MessageContent content={draft.content} channels={channels} guildRoles={roles} usersById={usersById} guildId={guildId} navigate={navigate} guilds={guilds} />}
                        {draft.files?.map((file) => (
                            <div key={file.id} className="app-draft-file">
                                <div className="app-draft-upload-line">
                                    {draft.status === 'failed'
                                        ? `\`${file.name}\` のアップロードに失敗しました`
                                        : `\`${file.name}\` をアップロード中... ${file.progress || 0}%`}
                                </div>
                                {file.previewUrl && (
                                    <div className="app-draft-image-frame" style={{ '--upload-progress': `${file.progress || 0}%` }}>
                                        <img src={file.previewUrl} alt={file.name} />
                                    </div>
                                )}
                            </div>
                        ))}
                        {draft.error && <div className="app-draft-error">{draft.error}</div>}
                    </div>
                </div>
            </div>
        </article>
    );
};

export default DraftUploadMessage;
