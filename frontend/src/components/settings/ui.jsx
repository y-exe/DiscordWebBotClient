/**
 * 設定ページ共通の UI プリミティブ
 */

import Symbol from '../common/Symbol';

export const PERMISSION_BITS = {
    CREATE_INVITE: 1,
    KICK_MEMBERS: 2,
    BAN_MEMBERS: 4,
    ADMINISTRATOR: 8,
    MANAGE_CHANNELS: 16,
    MANAGE_GUILD: 32,
    VIEW_AUDIT_LOG: 128,
    MANAGE_MESSAGES: 8192,
    MANAGE_ROLES: 268435456,
    MANAGE_WEBHOOKS: 536870912,
    MANAGE_EXPRESSIONS: 1073741824,
    MODERATE_MEMBERS: 1099511627776,
};

/**
 * 権限ビットは 2^53 を超えることがあるため BigInt で判定する。
 * myPermissions は文字列 / 数値 / BigInt を受け付ける。
 */
export const can = (myPermissions, bit) => {
    try {
        const perms = typeof myPermissions === 'bigint' ? myPermissions : BigInt(myPermissions ?? 0);
        const bitBig = typeof bit === 'bigint' ? bit : BigInt(bit);
        if ((perms & 8n) !== 0n) return true; // ADMINISTRATOR
        return (perms & bitBig) !== 0n;
    } catch {
        return false;
    }
};

export const InfoRow = ({ label, value, mono = false }) => (
    <div className="settings-info-row">
        <span>{label}</span>
        <strong className={mono ? 'font-mono text-sm' : undefined}>{value}</strong>
    </div>
);

export const SettingRow = ({ title, description, children, onClick, stacked = false }) => (
    <div className="settings-control-row" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
        <div className="settings-control-text">
            <span className="settings-control-title">{title}</span>
            {description && <span className="settings-control-description">{description}</span>}
        </div>
        {!stacked && children}
    </div>
);

export const SwitchRow = ({ title, description, checked, onChange, disabled = false }) => (
    <div
        className={`settings-control-row${disabled ? ' opacity-50 pointer-events-none' : ''}`}
        onClick={() => !disabled && onChange?.(!checked)}
        role="button"
        tabIndex={0}
    >
        <div className="settings-control-text">
            <span className="settings-control-title">{title}</span>
            {description && <span className="settings-control-description">{description}</span>}
        </div>
        <span className="app-modal-switch" data-checked={checked} aria-checked={checked} role="switch">
            <span className="app-modal-switch-knob" />
        </span>
    </div>
);

export const TextField = ({ label, value, onChange, placeholder, maxLength, multiline = false, rows = 3, counter = false, mono = false, type = 'text', autoFocus = false }) => (
    <label className="app-modal-field">
        <span className="app-modal-label">
            {label}
            {counter && maxLength ? <span className="ml-2 text-xs text-[var(--app-outline)]">{String(value ?? '').length}/{maxLength}</span> : null}
        </span>
        {multiline ? (
            <textarea
                className={`app-modal-input app-modal-textarea${mono ? ' font-mono text-sm' : ''}`}
                value={value ?? ''}
                placeholder={placeholder}
                maxLength={maxLength}
                rows={rows}
                autoFocus={autoFocus}
                onChange={(e) => onChange?.(e.target.value)}
            />
        ) : (
            <input
                className={`app-modal-input${mono ? ' font-mono text-sm' : ''}`}
                type={type}
                value={value ?? ''}
                placeholder={placeholder}
                maxLength={maxLength}
                autoFocus={autoFocus}
                onChange={(e) => onChange?.(e.target.value)}
            />
        )}
    </label>
);

export const SelectField = ({ label, value, options, onChange }) => (
    <label className="app-modal-field">
        <span className="app-modal-label">{label}</span>
        <select className="app-modal-input" value={value} onChange={(e) => onChange?.(e.target.value)}>
            {options.map(([optionValue, optionLabel]) => (
                <option key={String(optionValue)} value={optionValue}>{optionLabel}</option>
            ))}
        </select>
    </label>
);

export const SliderField = ({ label, value, min, max, onChange, suffix = '' }) => (
    <div className="settings-control-row flex-col items-stretch gap-2">
        <div className="flex items-center justify-between">
            <span className="settings-control-title">{label}</span>
            <output className="text-sm text-[var(--app-outline)]">{value}{suffix}</output>
        </div>
        <input
            type="range"
            className="app-slider"
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange?.(Number(e.target.value))}
        />
    </div>
);

export const ActionButton = ({ children, onClick, variant = 'tonal', disabled = false, busy = false, className = '' }) => {
    const classes = {
        tonal: 'settings-btn settings-btn-tonal',
        filled: 'settings-btn settings-btn-filled',
        outlined: 'settings-btn settings-btn-outlined',
        danger: 'settings-btn settings-btn-danger',
    };
    return (
        <button type="button" className={`${classes[variant]} ${className}`} onClick={onClick} disabled={disabled || busy}>
            {busy ? '処理中...' : children}
        </button>
    );
};

export const EmptyState = ({ icon, title, description }) => (
    <div className="settings-empty">
        {icon && <div className="settings-empty-icon">{icon}</div>}
        <strong>{title}</strong>
        {description && <p>{description}</p>}
    </div>
);

export const LoadingSpinner = ({ label = '読み込み中...' }) => (
    <div className="settings-loading">
        <span className="settings-loading-spinner" aria-hidden="true" />
        {label}
    </div>
);

/* ----------------------- 共通部品 ----------------------- */

/** CategoryButton の action 引数に使えるアイコン */
const CATEGORY_ACTIONS = {
    chevron: <Symbol size={18}>chevron_right</Symbol>,
    collapse: <Symbol size={18}>keyboard_arrow_down</Symbol>,
    external: <Symbol size={18}>open_in_new</Symbol>,
    copy: <Symbol size={18}>content_copy</Symbol>,
};

/**
 * for-web CategoryButton の React 版。
 * icon: Symbol 等の要素 / iconBlank: アイコン分の余白だけ確保
 * action: 'chevron' | 'collapse' | 'external' | 'copy' | 要素 | それらの配列
 * variant: 'tonal' (既定) | 'filled' | 'tertiary' | 'tertiaryAlt'
 */
export const CategoryButton = ({
    icon,
    iconBlank = false,
    iconBackground = true,
    roundedIcon = true,
    title,
    description,
    action,
    variant = 'tonal',
    disabled = false,
    onClick,
    className = '',
    children,
}) => {
    const actions = (Array.isArray(action) ? action : [action]).filter(Boolean);
    const classes = ['settings-category-button'];
    if (variant && variant !== 'tonal') classes.push(`is-${variant}`);
    if (disabled) classes.push('is-disabled');
    if (className) classes.push(className);
    const interactive = !disabled && Boolean(onClick);
    return (
        <div
            className={classes.join(' ')}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : onClick}
            onKeyDown={interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onClick(event);
                    }
                }
                : undefined}
        >
            <md-ripple />
            {!iconBlank && icon && (
                <span
                    className={`settings-category-button-icon${roundedIcon ? '' : ' is-square'}${iconBackground ? '' : ' is-transparent'}`}
                >
                    {icon}
                </span>
            )}
            {iconBlank && <span className="settings-category-button-icon is-blank" />}
            <div className="settings-category-button-content">
                {title && <span className="settings-category-button-title">{title}</span>}
                {children}
                {description && <span className="settings-category-button-description">{description}</span>}
            </div>
            {actions.map((item, index) => (
                <span key={index} className="settings-category-button-action">
                    {typeof item === 'string' ? CATEGORY_ACTIONS[item] : item}
                </span>
            ))}
        </div>
    );
};

/** CategoryButton.Group — 角丸 28px のまとまり */
export const CategoryButtonGroup = ({ children, className = '' }) => (
    <div className={`settings-category-button-group ${className}`.trim()}>{children}</div>
);

/** CategoryButton.Collapse — 開閉できるまとまり */
export const CategoryButtonCollapse = ({ title, description, icon, action, children }) => (
    <details className="settings-cat-details">
        <summary>
            <CategoryButton icon={icon} title={title} description={description} action={[action, 'collapse']} />
        </summary>
        <div className="settings-cat-details-inner">{children}</div>
    </details>
);

/** CategoryButton.Select — 選択肢を展開するドロップダウン */
export const CategorySelect = ({ icon, title, value, options = [], onChange, action, disabled = false }) => {
    const current = options.find((opt) => opt.value === value) || options[0];
    return (
        <details className="settings-cat-details">
            <summary>
                <CategoryButton
                    icon={icon}
                    title={title}
                    description={current?.label}
                    action={[action, 'collapse']}
                    disabled={disabled}
                />
            </summary>
            <div className="settings-cat-details-inner">
                {options.map((opt) => {
                    const selected = opt.value === value;
                    return (
                        <CategoryButton
                            key={opt.value}
                            icon={opt.icon}
                            iconBlank={!opt.icon}
                            title={opt.label}
                            description={opt.description}
                            variant={selected ? 'tertiaryAlt' : 'tertiary'}
                            action={<span className="settings-cat-radio" data-checked={selected} />}
                            onClick={() => onChange?.(opt.value)}
                        />
                    );
                })}
            </div>
        </details>
    );
};

/**
 * for-web Checkbox (mdui-checkbox) の React 版。
 * onChange には { currentTarget: { checked } } を渡す (for-web 互換)。
 */
export const Checkbox = ({ checked, onChange, disabled = false, className = '', children }) => (
    <label className={`settings-checkbox${disabled ? ' is-disabled' : ''} ${className}`.trim()}>
        <input
            type="checkbox"
            checked={checked}
            readOnly={onChange ? undefined : true}
            disabled={disabled}
            onChange={(e) => onChange?.({ currentTarget: { checked: e.target.checked } })}
        />
        <span className="settings-checkbox-box">
            <Symbol size={18} fill className="settings-checkbox-check">check</Symbol>
        </span>
        {children != null && <span className="settings-checkbox-label">{children}</span>}
    </label>
);

/**
 * for-web Button の React 版 (Expressive グループ)。
 * group: 'connected-start' | 'connected' | 'connected-end' | 'standard'
 * groupActive 時は shape=round + variant=filled、それ以外は square + tonal。
 */
export const GroupButton = ({
    children,
    size = 'sm',
    group,
    groupActive = false,
    bg,
    onPress,
    className = '',
    ...rest
}) => {
    const shape = group ? (groupActive !== (group === 'standard') ? 'round' : 'square') : 'round';
    const classes = [
        'app-expressive-button',
        `size-${size}`,
        `shape-${shape}`,
        ...(group ? [`group-${group}`, ...(groupActive ? ['is-active'] : [])] : []),
        ...(className ? [className] : []),
    ];
    return (
        <button
            type="button"
            className={classes.join(' ')}
            style={bg ? { background: bg } : undefined}
            onClick={onPress}
            aria-pressed={group ? groupActive : undefined}
            {...rest}
        >
            <md-ripple />
            {children}
        </button>
    );
};

/** for-web Row の簡易版 (gap は px 数値) */
export const Row = ({ gap = 8, justify, align = true, wrap = false, className = '', children, style }) => (
    <div
        className={`settings-row${justify === 'stretch' ? ' is-stretch' : ''} ${className}`.trim()}
        style={{
            '--row-gap': `${gap}px`,
            justifyContent: justify === 'center' ? 'center' : undefined,
            alignItems: align ? 'center' : undefined,
            flexWrap: wrap ? 'wrap' : undefined,
            ...style,
        }}
    >
        {children}
    </div>
);

/** for-web Text class="title" の見出し */
export const SectionTitle = ({ children, className = '' }) => (
    <div className={`settings-section-title ${className}`.trim()}>{children}</div>
);

/** for-web Text class="label" の小見出し */
export const SectionLabel = ({ children, className = '' }) => (
    <div className={`settings-section-label ${className}`.trim()}>{children}</div>
);
