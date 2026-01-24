import { useCallback, useEffect, useState } from 'react';
import {
    EmptyState,
    LoadingSpinner,
    PERMISSION_BITS,
    SectionLabel,
    can,
} from '../ui';

const AUDIT_ACTION_LABELS = {
    1: 'サーバーを更新',
    10: 'チャンネルを作成', 11: 'チャンネルを更新', 12: 'チャンネルを削除',
    13: 'チャンネル上書きを作成', 14: 'チャンネル上書きを更新', 15: 'チャンネル上書きを削除',
    20: 'メンバーをキック', 21: 'メンバーをBAN', 22: 'BANを解除', 23: 'メンバーを更新', 24: 'メンバーのロールを更新', 25: 'メンバーを移動', 26: 'メンバーを切断', 27: 'ボイスチャンネルに追加', 28: 'ボイスチャンネルから削除',
    30: '役職を作成', 31: '役職を更新', 32: '役職を削除',
    40: '招待を作成', 41: '招待を更新', 42: '招待を削除',
    50: 'ウェブフックを作成', 51: 'ウェブフックを更新', 60: 'ウェブフックを削除',
    62: '絵文字を作成', 72: '絵文字を削除', 73: 'スタンプを作成', 74: 'スタンプを更新', 75: 'スタンプを削除',
    80: 'スレッドを作成', 81: 'スレッドを更新', 82: 'スレッドを削除',
    83: 'ステッカーを作成',
    90: 'サーバー統合を作成', 91: 'サーバー統合を更新', 92: 'サーバー統合を削除',
    100: 'メンバーのタイムアウト', 101: 'タイムアウトを解除', 102: 'メンバーのペナルティ追加',
    110: '自動モデレーションルール作成', 111: '自動モデレーションルール更新', 112: '自動モデレーションルール削除',
    121: 'ブロックされた用語を作成', 130: 'ボイスチャンネルステータス更新',
};

const formatDateTime = (timestamp) => {
    if (!timestamp) return '—';
    try {
        return new Date(timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
};

/**
 * サーバー設定: 監査ログ
 */
export const GuildAuditLogPage = ({ socket, guildId, myPermissions }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        if (!socket || !guildId) return;
        socket.timeout(15000).emit('getGuildAuditLogs', { guildId, limit: 50 }, (err, result) => {
            setLoading(false);
            if (err || !result?.ok) {
                setError(result?.error || '監査ログを取得できませんでした');
                return;
            }
            setEntries(result.entries || []);
        });
    }, [socket, guildId]);

    useEffect(() => { load(); }, [load]);

    if (!can(myPermissions, PERMISSION_BITS.VIEW_AUDIT_LOG)) {
        return <EmptyState title="監査ログを表示する権限がありません" />;
    }

    return (
        <div className="settings-page">
            <SectionLabel>監査ログ (最新{entries.length}件)</SectionLabel>
            {error && <p className="app-modal-error">{error}</p>}
            {loading ? <LoadingSpinner /> : entries.length === 0 ? (
                <EmptyState title="ログはありません" />
            ) : (
                <div className="settings-list">
                    {entries.map((entry) => (
                        <div key={entry.id} className="settings-list-row">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate">
                                    {AUDIT_ACTION_LABELS[entry.action] || `操作 ${entry.action}`}
                                    {entry.target?.username ? ` — ${entry.target.username}` : ''}
                                    {entry.count && Number(entry.count) > 1 ? ` ×${entry.count}` : ''}
                                </span>
                                <span className="block text-xs text-[var(--app-outline)]">
                                    {entry.executor ? `${entry.executor.username} が実行` : 'システム'} ・ {formatDateTime(entry.createdAt)}
                                    {entry.reason ? ` ・ 理由: ${entry.reason}` : ''}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
