import { useState } from 'react';
import Modal from '../common/Modal';

const isSubcommand = (opt) => opt.type === 1 || opt.type === 2;

const hasValue = (value) => value !== undefined && value !== null && value !== '';

/**
 * スラッシュコマンドのオプション入力モーダル
 */
const SlashCommandModal = ({
    open = true,
    command,
    channels = [],
    roles = [],
    members = [],
    busy = false,
    error = null,
    onSubmit,
    onClose,
}) => {
    const [groupPath, setGroupPath] = useState('');
    const [subPath, setSubPath] = useState('');
    const [values, setValues] = useState({});

    const options = command?.options || [];
    const subcommands = options.filter(isSubcommand);
    const plainOptions = options.filter((opt) => !isSubcommand(opt));

    const group = subcommands[0]?.type === 2
        ? subcommands.find((s) => s.name === groupPath) || subcommands[0]
        : null;
    const sub = group
        ? (group.options || []).find((s) => s.name === subPath) || (group.options || [])[0]
        : subcommands[0] && (subcommands.find((s) => s.name === subPath) || subcommands[0]);
    const leafOptions = sub ? sub.options || [] : plainOptions;

    const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));

    const buildOptions = () => {
        const leaves = leafOptions
            .map((opt) => ({ name: opt.name, type: opt.type, value: values[opt.name] }))
            .filter((opt) => hasValue(opt.value));
        if (group && sub) return [{ name: group.name, type: 2, options: [{ name: sub.name, type: 1, options: leaves }] }];
        if (sub) return [{ name: sub.name, type: 1, options: leaves }];
        return leaves;
    };

    const canSubmit = !busy && leafOptions
        .filter((opt) => opt.required)
        .every((opt) => hasValue(values[opt.name]));

    const renderOption = (opt) => {
        const label = (
            <span className="app-modal-label">
                {opt.name}
                {opt.required && <span style={{ color: 'var(--app-error)' }}> *</span>}
            </span>
        );
        const hint = opt.description
            ? <span style={{ fontSize: 12, color: 'var(--app-on-surface-variant)' }}>{opt.description}</span>
            : null;

        if (opt.type === 3 && opt.choices?.length > 0) {
            return (
                <label className="app-modal-field" key={opt.name}>
                    {label}
                    <select
                        className="app-modal-input"
                        value={values[opt.name] ?? ''}
                        onChange={(e) => setValue(opt.name, e.target.value)}
                    >
                        <option value="">未選択</option>
                        {opt.choices.map((choice) => (
                            <option key={String(choice.value)} value={String(choice.value)}>{choice.name}</option>
                        ))}
                    </select>
                    {hint}
                </label>
            );
        }

        if (opt.type === 5) {
            return (
                <label className="app-modal-field" key={opt.name}>
                    {label}
                    <select
                        className="app-modal-input"
                        value={values[opt.name] ?? ''}
                        onChange={(e) => setValue(opt.name, e.target.value)}
                    >
                        <option value="">未選択</option>
                        <option value="true">はい</option>
                        <option value="false">いいえ</option>
                    </select>
                    {hint}
                </label>
            );
        }

        if (opt.type === 4 || opt.type === 10) {
            return (
                <label className="app-modal-field" key={opt.name}>
                    {label}
                    <input
                        type="number"
                        step={opt.type === 4 ? 1 : 'any'}
                        className="app-modal-input"
                        value={values[opt.name] ?? ''}
                        onChange={(e) => setValue(opt.name, e.target.value)}
                    />
                    {hint}
                </label>
            );
        }

        if (opt.type === 7 && channels.length > 0) {
            return (
                <label className="app-modal-field" key={opt.name}>
                    {label}
                    <select
                        className="app-modal-input"
                        value={values[opt.name] ?? ''}
                        onChange={(e) => setValue(opt.name, e.target.value)}
                    >
                        <option value="">未選択</option>
                        {channels.map((channel) => (
                            <option key={channel.id} value={channel.id}>#{channel.name}</option>
                        ))}
                    </select>
                    {hint}
                </label>
            );
        }

        if (opt.type === 8 && roles.length > 0) {
            return (
                <label className="app-modal-field" key={opt.name}>
                    {label}
                    <select
                        className="app-modal-input"
                        value={values[opt.name] ?? ''}
                        onChange={(e) => setValue(opt.name, e.target.value)}
                    >
                        <option value="">未選択</option>
                        {roles.map((role) => (
                            <option key={role.id} value={role.id}>@{role.name}</option>
                        ))}
                    </select>
                    {hint}
                </label>
            );
        }

        if ((opt.type === 6 || opt.type === 9) && members.length > 0) {
            return (
                <label className="app-modal-field" key={opt.name}>
                    {label}
                    <select
                        className="app-modal-input"
                        value={values[opt.name] ?? ''}
                        onChange={(e) => setValue(opt.name, e.target.value)}
                    >
                        <option value="">未選択</option>
                        {members.map((member) => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                    </select>
                    {hint}
                </label>
            );
        }

        return (
            <label className="app-modal-field" key={opt.name}>
                {label}
                <input
                    type="text"
                    className="app-modal-input"
                    value={values[opt.name] ?? ''}
                    maxLength={4000}
                    placeholder={opt.type === 6 || opt.type === 9 ? 'ユーザーID' : opt.type === 7 ? 'チャンネルID' : opt.type === 8 ? '役職ID' : ''}
                    onChange={(e) => setValue(opt.name, e.target.value)}
                />
                {hint}
            </label>
        );
    };

    return (
        <Modal
            open={open && Boolean(command)}
            title={`/${command?.name || ''}`}
            description={[command?.application_name, command?.description].filter(Boolean).join(' — ')}
            onClose={busy ? undefined : onClose}
            width={480}
            footer={(
                <>
                    <button type="button" className="app-modal-button" onClick={onClose} disabled={busy}>キャンセル</button>
                    <button
                        type="button"
                        className="app-modal-button app-modal-button-primary"
                        disabled={!canSubmit}
                        onClick={() => onSubmit?.(buildOptions())}
                    >
                        {busy ? '送信中...' : '実行'}
                    </button>
                </>
            )}
        >
            <div className="app-modal-form">
                {group && (
                    <label className="app-modal-field">
                        <span className="app-modal-label">コマンドグループ</span>
                        <select
                            className="app-modal-input"
                            value={group.name}
                            onChange={(e) => { setGroupPath(e.target.value); setSubPath(''); }}
                        >
                            {subcommands.map((s) => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                    </label>
                )}
                {sub && (group || subcommands.length > 0) && (
                    <label className="app-modal-field">
                        <span className="app-modal-label">サブコマンド</span>
                        <select
                            className="app-modal-input"
                            value={sub.name}
                            onChange={(e) => setSubPath(e.target.value)}
                        >
                            {(group ? group.options || [] : subcommands).map((s) => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                    </label>
                )}
                {leafOptions.map(renderOption)}
                {error && <p className="app-modal-error">{error}</p>}
            </div>
        </Modal>
    );
};

export default SlashCommandModal;
