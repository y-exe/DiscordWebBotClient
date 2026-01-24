import { useState } from 'react';
import Modal from '../common/Modal';

/**
 * フレンド追加モーダル (for-web add_friend)
 */
const AddFriendModal = ({ open = true, busy = false, error = null, success = null, onSubmit, onClose }) => {
    const [username, setUsername] = useState('');
    const canSubmit = username.trim().length > 0 && !busy;

    const submit = () => {
        if (!canSubmit) return;
        onSubmit?.({ username: username.trim() });
    };

    return (
        <Modal
            open={open}
            title="フレンドに追加"
            description="ユーザー名でフレンド申請を送信できます。"
            onClose={busy ? undefined : onClose}
            width={440}
            footer={(
                <>
                    <button type="button" className="app-modal-button" onClick={onClose} disabled={busy}>キャンセル</button>
                    <button
                        type="button"
                        className="app-modal-button app-modal-button-primary"
                        disabled={!canSubmit}
                        onClick={submit}
                    >
                        {busy ? '処理中...' : 'フレンド申請を送信'}
                    </button>
                </>
            )}
        >
            <form className="app-modal-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <label className="app-modal-field">
                    <span className="app-modal-label">ユーザー名</span>
                    <input
                        className="app-modal-input"
                        value={username}
                        maxLength={64}
                        placeholder="ユーザー名を入力"
                        autoFocus
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </label>
                {success && <p className="app-modal-success">{success}</p>}
                {error && <p className="app-modal-error">{error}</p>}
            </form>
        </Modal>
    );
};

export default AddFriendModal;
