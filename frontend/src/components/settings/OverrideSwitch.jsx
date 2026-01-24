import Symbol from '../common/Symbol';

/**
 * for-web の Switch.Override を React で再現したもの。
 * チャンネル権限の「許可 / 未設定 / 拒否」3状態セグメントスイッチ。
 *
 * Stoat実装: 36x36px の3セル、コンテナ角丸12px・bg primary-container、
 * 選択セル: allow = bg on-primary-container/colour primary-container、
 *          neutral = bg on-secondary/colour secondary、
 *          deny = bg on-error-container/colour error-container
 */
export default function OverrideSwitch({ value = 'neutral', onChange, disabled = false }) {
    const cell = (type, icon) => (
        <div
            role="radio"
            aria-checked={value === type}
            data-type={type}
            data-selected={value}
            onClick={() => { if (!disabled) onChange?.(type); }}
            style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                flex: '0 0 36px',
                display: 'flex',
                cursor: disabled ? 'not-allowed' : 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transitions-fast) all, background-color 0.1s ease-in-out, color 0.1s ease-in-out',
                background: 'var(--app-surface-container-high)',
                opacity: disabled ? 0.6 : 1,
                ...(value === type && type === 'allow' ? {
                    color: 'var(--app-primary-container)',
                    background: 'var(--app-on-primary-container)',
                } : null),
                ...(value === type && type === 'neutral' ? {
                    color: 'var(--app-secondary-container)',
                    background: 'var(--app-on-secondary-container)',
                } : null),
                ...(value === type && type === 'deny' ? {
                    color: 'var(--app-error-container, #93000a)',
                    background: 'var(--app-on-error-container, #ffdad6)',
                } : null),
            }}
        >
            <Symbol size={20}>{icon}</Symbol>
        </div>
    );

    return (
        <div
            role="radiogroup"
            style={{
                flexShrink: 0,
                display: 'inline-flex',
                margin: '4px 0',
                overflow: 'hidden',
                borderRadius: 'var(--app-radius-md)',
                transition: 'var(--transitions-fast) all',
                background: 'var(--app-primary-container)',
            }}
        >
            {cell('allow', 'check')}
            {cell('neutral', 'remove')}
            {cell('deny', 'close')}
        </div>
    );
}
