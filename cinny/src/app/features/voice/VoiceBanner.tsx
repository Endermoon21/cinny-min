import React from 'react';
import classNames from 'classnames';
import { useLiveKitContext } from './LiveKitContext';
import { PingVisualizer } from './PingVisualizer';
import { MediaControlsRow } from './MediaControlsRow';
import * as css from './voicePanel.css';

// RNNoise waveform icons
const RNNoiseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10v4" />
    <path d="M6 6v12" />
    <path d="M10 3v18" />
    <path d="M14 8v8" />
    <path d="M18 5v14" />
    <path d="M22 10v4" />
  </svg>
);

const RNNoiseActiveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10v4" />
    <path d="M6 6v12" />
    <path d="M10 3v18" />
    <path d="M14 8v8" />
    <path d="M18 5v14" />
    <path d="M22 10v4" />
    <circle cx="12" cy="12" r="3" fill="#43B581" stroke="none" />
  </svg>
);

const DisconnectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
    <line x1="22" x2="2" y1="2" y2="22" />
  </svg>
);

export function VoiceBanner() {
  const {
    currentRoom,
    disconnect,
    isNoiseFilterEnabled,
    isNoiseFilterPending,
    setNoiseFilterEnabled,
  } = useLiveKitContext();

  const roomDisplayName = currentRoom
    ? currentRoom.charAt(0).toUpperCase() + currentRoom.slice(1)
    : 'Voice Channel';

  const handleNoiseFilter = () => {
    if (!isNoiseFilterPending) {
      setNoiseFilterEnabled(!isNoiseFilterEnabled);
    }
  };

  return (
    <div className={css.VoiceBanner}>
      {/* Top Section */}
      <div className={css.VoiceBannerTop}>
        <div className={css.VoiceBannerInfo}>
          <PingVisualizer />
          <div className={css.VoiceStatusSection}>
            <span className={css.VoiceConnectedLabel}>Voice Connected</span>
            <span className={css.VoiceChannelName}>{roomDisplayName}</span>
          </div>
        </div>
        
        <div className={css.VoiceBannerControls}>
          <button
            className={classNames(css.NoiseFilterBtn, {
              [css.NoiseFilterBtnActive]: isNoiseFilterEnabled,
            })}
            onClick={handleNoiseFilter}
            disabled={isNoiseFilterPending}
            title={isNoiseFilterEnabled ? 'Disable RNNoise' : 'Enable RNNoise'}
            style={{ opacity: isNoiseFilterPending ? 0.5 : 1 }}
          >
            {isNoiseFilterEnabled ? <RNNoiseActiveIcon /> : <RNNoiseIcon />}
          </button>
          
          <button
            className={css.DisconnectBtn}
            onClick={disconnect}
            title="Disconnect"
          >
            <DisconnectIcon />
          </button>
        </div>
      </div>

      {/* Media Controls Row */}
      <MediaControlsRow />
    </div>
  );
}
