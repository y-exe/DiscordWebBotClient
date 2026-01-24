import { useState } from 'react';
import { TextField, ActionButton, SectionTitle } from '../ui';

const DeleteChannelPage = ({ socket, channel, onDone }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [confirmText, setConfirmText] = useState('');

    return (
        <div className="settings-page">
            <SectionTitle>チャンネルを削除</SectionTitle>
            <p className="settings-card-description">この操作は取り消せません。全メッセージが失われます。</p>
            <TextField label={`確認のため「${channel?.name || 'このチャンネル'}」と入力してください`} value={confirmText} onChange={setConfirmText} />
            <div className="settings-actions">
                <button
                    type="button"
                    className="settings-btn settings-btn-danger"
                    disabled={busy || confirmText !== (channel?.name || '')}
                    onClick={() => {
                        setBusy(true);
                        socket.timeout(15000).emit('deleteChannel', { channelId: channel.id }, (err, result) => {
                            setBusy(false);
                            if (err || !result?.ok) {
                                setError(result?.error || 'チャンネルを削除できませんでした');
                                return;
                            }
                            onDone?.();
                        });
                    }}
                >
                    {busy ? '削除中...' : 'チャンネルを削除'}
                </button>
            </div>
            {error && <p className="app-modal-error">{error}</p>}
        </div>
    );
};

const DeleteOrLeaveGuildPage = ({ socket, guild, mode, onDone }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [confirmText, setConfirmText] = useState('');
    const isDelete = mode === 'delete';
    const eventName = isDelete ? 'deleteGuild' : 'leaveGuild';

    return (
        <div className="settings-page">
            <SectionTitle>{isDelete ? 'サーバーを削除' : 'サーバーから退出'}</SectionTitle>
            <p className="settings-card-description">
                {isDelete
                    ? 'この操作は取り消せません。サーバーとすべてのデータが完全に失われます。'
                    : 'サーバーから退出します。再度参加するには招待が必要です。'}
            </p>
            <TextField label={`確認のため「${guild?.name || ''}」と入力してください`} value={confirmText} onChange={setConfirmText} />
            <div className="settings-actions">
                <button
                    type="button"
                    className="settings-btn settings-btn-danger"
                    disabled={busy || !guild?.name || confirmText !== guild.name}
                    onClick={() => {
                        setBusy(true);
                        socket.timeout(20000).emit(eventName, { guildId: guild.id }, (err, result) => {
                            setBusy(false);
                            if (err || !result?.ok) {
                                setError(result?.error || '操作できませんでした');
                                return;
                            }
                            onDone?.();
                        });
                    }}
                >
                    {busy ? '処理中...' : isDelete ? 'サーバーを削除' : '退出する'}
                </button>
            </div>
            {error && <p className="app-modal-error">{error}</p>}
        </div>
    );
};
export {
    DeleteChannelPage,
    DeleteOrLeaveGuildPage,
};
