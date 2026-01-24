import { useState } from 'react';
import Modal from '../common/Modal';
import { getProxyUrl } from '../../utils/helpers';

/**
 * グループDM作成モーダル (グループ名 + フレンド選択)
 * for-web の create_group モーダル相当。
 */
const GroupModal = ({ open = true, busy = false, error = null, friends = [], onSubmit, onClose }) => {
    const [name, setName] = useState('');
    const [selected, setSelected] = useState(() => new Set());

    const toggle = (id) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const friendList = friends.filter((friend) => friend.relationshipType === 'friend');
    const canSubmit = selected.size > 0 && !busy;

    const submit = () => {
        if (!canSubmit) return;
        onSubmit?.({ name: name.trim(), userIds: Array.from(selected) });
    };

    return (
        <Modal
            open={open}
            title="グループDMを作成"
            description="フレンドを選択して新しいグループを作成できます。"
            onClose={busy ? undefined : onClose}
            width={460}
            footer={(
                <>
                    <button type="button" className="app-modal-button" onClick={onClose} disabled={busy}>キャンセル</button>
                    <button
                        type="button"
                        className="app-modal-button app-modal-button-primary"
                        disabled={!canSubmit}
                        onClick={submit}
                    >
                        {busy ? '処理中...' : '作成'}
                    </button>
                </>
            )}
        >
            <form className="app-modal-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <label className="app-modal-field">
                    <span className="app-modal-label">グループ名(任意)</span>
                    <input className="app-modal-input" value={name} maxLength={100} placeholder="新しいグループ" onChange={(e) => setName(e.target.value)} />
                </label>
                <div className="app-group-member-list" aria-busy={busy}>
                    {friendList.map((friend) => (
                        <button
                            key={friend.id}
                            type="button"
                            className="app-group-member-row"
                            data-selected={selected.has(friend.id) ? 'true' : 'false'}
                            onClick={() => toggle(friend.id)}
                        >
                            <span className="app-avatar app-group-member-avatar">
                                {friend.avatar
                                    ? <img src={getProxyUrl(friend.avatar)} alt="" />
                                    : <span>{(friend.displayName || friend.username || '?')[0]?.toUpperCase()}</span>}
                            </span>
                            <span className="app-group-member-name">{friend.displayName || friend.username}</span>
                        </button>
                    ))}
                    {friendList.length === 0 && (
                        <p className="app-group-member-empty">フレンドがいません</p>
                    )}
                </div>
                {error && <p className="app-modal-error">{error}</p>}
            </form>
        </Modal>
    );
};

export default GroupModal;
