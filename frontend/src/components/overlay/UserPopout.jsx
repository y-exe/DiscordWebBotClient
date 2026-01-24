import { useEffect, useMemo, useState } from 'react';
import { FaCakeCandles, FaCircleExclamation, FaRobot, FaRotateRight, FaShieldHalved, FaUserGroup } from 'react-icons/fa6';

import { getProxyUrl } from '../../utils/helpers';

const normalizeProfile = (data, guildId, fallbackUser) => {
  if (!data || data.error) return data;
  const serverProfile = data.serverProfiles?.find((item) => item.guildId === guildId) || data.serverProfiles?.[0];
  return {
    ...fallbackUser,
    ...data,
    displayName: data.displayName || serverProfile?.displayName || data.globalName || data.username || fallbackUser?.displayName,
    avatar: data.avatar || serverProfile?.guildAvatarURL || data.avatarURL || fallbackUser?.avatar,
    banner: data.banner || data.bannerURL,
    roles: data.roles || serverProfile?.roles || [],
    joinedAt: data.joinedAt || serverProfile?.joinedAt,
    status: data.status || fallbackUser?.status || 'offline',
  };
};

const statusLabel = { online: 'オンライン', idle: '退席中', dnd: '取り込み中', offline: 'オフライン', invisible: 'オフライン' };

const UserPopout = ({ userId, guildId, anchor, socket, fallbackUser, onClose }) => {
  const [result, setResult] = useState({ status: 'loading', profile: null, error: '' });
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let finished = false;
    let fallbackStarted = false;
    queueMicrotask(() => setResult({ status: 'loading', profile: null, error: '' }));

    const finish = (data) => {
      if (finished || !data) return;
      if (data.error) {
        if (!fallbackStarted) requestLegacy();
        return;
      }
      finished = true;
      setResult({ status: 'ready', profile: normalizeProfile(data, guildId, fallbackUser), error: '' });
    };

    const requestLegacy = () => {
      if (fallbackStarted || finished) return;
      fallbackStarted = true;
      socket.emit('getUserInfo', userId, finish);
    };

    socket.emit('getUserProfile', { userId, guildId }, finish);
    const fallbackTimer = window.setTimeout(requestLegacy, 1800);
    const timeoutTimer = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      setResult({ status: 'error', profile: null, error: 'プロフィールを取得できませんでした。接続を確認して再試行してください。' });
    }, 9000);

    return () => {
      finished = true;
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(timeoutTimer);
    };
  }, [fallbackUser, guildId, requestKey, socket, userId]);

  const position = useMemo(() => {
    const width = Math.min(360, window.innerWidth - 16);
    const gap = 12;
    const spaceRight = window.innerWidth - anchor.right - gap - 8;
    const spaceLeft = anchor.left - gap - 8;
    const side = spaceRight >= width || spaceRight >= spaceLeft ? 'right' : 'left';
    const preferredLeft = side === 'right' ? anchor.right + gap : anchor.left - width - gap;
    const left = Math.max(8, Math.min(preferredLeft, window.innerWidth - width - 8));
    const top = Math.max(8, Math.min(anchor.top, window.innerHeight - Math.min(520, window.innerHeight - 16) - 8));
    return { left, top, width, side };
  }, [anchor]);

  const profile = result.profile;
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : '不明';

  return (
    <>
      <div className="app-profile-scrim" onClick={onClose} />
      <section className="app-profile-card" style={{ left: position.left, top: position.top, width: position.width }} data-side={position.side} onClick={(event) => event.stopPropagation()} aria-label="ユーザープロフィール">
        {result.status === 'loading' && (
          <div className="app-profile-loading" role="status">
            <div className="app-profile-skeleton banner" />
            <div className="app-profile-skeleton avatar" />
            <div className="app-profile-skeleton line wide" />
            <div className="app-profile-skeleton line" />
          </div>
        )}

        {result.status === 'error' && (
          <div className="app-profile-error">
            <span className="app-profile-error-icon"><FaCircleExclamation /></span>
            <h2>読み込めませんでした</h2>
            <p>{result.error}</p>
            <md-filled-tonal-button type="button" onClick={() => setRequestKey((key) => key + 1)}><FaRotateRight slot="icon" />再試行</md-filled-tonal-button>
          </div>
        )}

        {result.status === 'ready' && profile && (
          <>
            <div
              className="app-profile-banner"
              data-image={profile.banner ? 'true' : 'false'}
              style={{
                '--profile-accent': profile.accentColor || 'var(--app-primary-container)',
                backgroundImage: profile.banner ? `linear-gradient(color-mix(in srgb, var(--app-surface-container-low) 38%, transparent), color-mix(in srgb, var(--app-surface-container-low) 38%, transparent)), url("${getProxyUrl(profile.banner)}")` : undefined,
              }}
            />
            <div className="app-profile-body">
              <div className="app-profile-identity">
                <div className="app-profile-avatar-wrap">
                  {profile.avatar ? <img src={getProxyUrl(profile.avatar)} className="app-profile-avatar" alt="" /> : <span className="app-profile-avatar fallback">{profile.username?.[0]?.toUpperCase() || '?'}</span>}
                  <span className="app-profile-status" data-status={profile.status} title={statusLabel[profile.status] || 'オフライン'} />
                </div>
                <div className="app-profile-names">
                  <div className="app-profile-display-name">{profile.displayName}</div>
                  <div className="app-profile-username">@{profile.username}</div>
                </div>
                {profile.bot && <span className="app-profile-bot"><FaRobot /> BOT</span>}
              </div>

              {(profile.bio || profile.pronouns) && <div className="app-profile-about">{profile.pronouns && <span className="app-profile-pronouns">{profile.pronouns}</span>}{profile.bio && <p>{profile.bio}</p>}</div>}

              <div className="app-profile-facts">
                <div><FaCakeCandles /><span><small>Discord参加日</small>{formatDate(profile.createdAt)}</span></div>
                {profile.joinedAt && <div><FaUserGroup /><span><small>サーバー参加日</small>{formatDate(profile.joinedAt)}</span></div>}
              </div>

              {profile.roles?.length > 0 && (
                <div className="app-profile-section">
                  <h3><FaShieldHalved /> ロール</h3>
                  <div className="app-profile-roles">
                    {profile.roles.map((role) => <span key={role.id || role.name} className="app-profile-role"><i style={{ background: role.color && role.color !== '#000000' ? role.color : 'var(--app-outline)' }} />{role.name}</span>)}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default UserPopout;
