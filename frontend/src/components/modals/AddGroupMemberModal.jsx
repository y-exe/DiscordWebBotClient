import { useState } from 'react';
import Modal from '../common/Modal';
import { getProxyUrl } from '../../utils/helpers';

/**
 * グループDMへのメンバー追加モーダル (for-web add_members_to_group)
 */
const AddGroupMemberModal = ({ open = true, busy = false, error = null, friends = [], existingIds = [], onSubmit, onClose }) => {
    const [selected, setSelected] = useState(() => new Set());

    const toggle = (id) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const existing = new Set(existingIds);
    const candidates = friends.filter((friend) => friend.relationshipType === 'friend' && !existing.has(friend.id));
    const canSubmit = selected.size > 0 && !busy;

    const submit = () => {
        if (!canSubmit) return;
        onSubmit?.({ userIds: Array.from(selected) });
    };

    return (
        <Modal
            open={open}
            title="メンバーを追加"
            description="フレンドをこのグループに追加できます。"
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
                        {busy ? '処理中...' : '追加'}
                    </button>
                </>
            )}
        >
            <div className="app-group-member-list" aria-busy={busy}>
                {candidates.map((friend) => (
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
                {candidates.length === 0 && (
                    <p className="app-group-member-empty">追加できるフレンドがいません</p>
                )}
            </div>
            {error && <p className="app-modal-error">{error}</p>}
        </Modal>
    );
};

export default AddGroupMemberModal;
