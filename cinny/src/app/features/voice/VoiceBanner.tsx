import React, { useState, useRef, useEffect } from 'react';
import classNames from 'classnames';
import { useLiveKitContext } from './LiveKitContext';
import { PingVisualizer } from './PingVisualizer';
import { MediaControlsRow } from './MediaControlsRow';
import * as css from './voicePanel.css';

// Noise suppression waveform icons
const NoiseFilterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10v4" />
    <path d="M6 6v12" />
    <path d="M10 3v18" />
    <path d="M14 8v8" />
    <path d="M18 5v14" />
    <path d="M22 10v4" />
  </svg>
);

const NoiseFilterActiveIcon = () => (
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
    suppressionLevel,
    setSuppressionLevel,
    isNoiseFilterSupported,
  } = useLiveKitContext();

  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const roomDisplayName = currentRoom
    ? currentRoom.charAt(0).toUpperCase() + currentRoom.slice(1)
    : 'Voice Channel';

  const handleToggle = () => {
    console.log('[VoiceBanner] handleToggle called', {
      isNoiseFilterPending,
      isNoiseFilterEnabled,
      isNoiseFilterSupported,
    });
    if (!isNoiseFilterPending) {
      setNoiseFilterEnabled(!isNoiseFilterEnabled);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSuppressionLevel(parseInt(e.target.value, 10));
  };

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModal]);

  return (
    <div className={css.VoiceBanner} style={{ position: 'relative' }}>
      {/* Noise Suppression Modal */}
      {showModal && (
        <div ref={modalRef} className={css.RNNoiseModal}>
          <div className={css.RNNoiseModalHeader}>
            <span className={css.RNNoiseModalIcon}>
              {isNoiseFilterEnabled ? <NoiseFilterActiveIcon /> : <NoiseFilterIcon />}
            </span>
            <span className={css.RNNoiseModalTitle}>Noise Suppression</span>
          </div>
          <div className={css.RNNoiseModalContent}>
            {/* Enable/Disable Toggle */}
            <div className={css.RNNoiseModalRow}>
              <div className={css.RNNoiseModalLabel}>
                <span className={css.RNNoiseModalLabelText}>DeepFilterNet</span>
                <span className={css.RNNoiseModalLabelDesc}>AI-powered noise removal</span>
              </div>
              <button
                className={classNames(css.ToggleSwitch, {
                  [css.ToggleSwitchActive]: isNoiseFilterEnabled,
                })}
                onClick={handleToggle}
                disabled={isNoiseFilterPending || !isNoiseFilterSupported}
                style={{ opacity: (isNoiseFilterPending || !isNoiseFilterSupported) ? 0.5 : 1 }}
              >
                <span className={css.ToggleSwitchKnob} />
              </button>
            </div>

            {/* Suppression Level Slider */}
            {isNoiseFilterEnabled && (
              <div className={css.RNNoiseModalRow} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div className={css.RNNoiseModalLabel}>
                  <span className={css.RNNoiseModalLabelText}>Suppression Level</span>
                  <span className={css.RNNoiseModalLabelDesc}>{suppressionLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={suppressionLevel}
                  onChange={handleSliderChange}
                  className={css.SuppressionSlider}
                />
              </div>
            )}

            {/* Not supported warning */}
            {!isNoiseFilterSupported && (
              <div className={css.RNNoiseModalRow}>
                <span className={css.RNNoiseModalLabelDesc} style={{ color: '#F04747' }}>
                  Not supported in this browser
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
            ref={buttonRef}
            className={classNames(css.NoiseFilterBtn, {
              [css.NoiseFilterBtnActive]: isNoiseFilterEnabled,
            })}
            onClick={() => setShowModal(!showModal)}
            title="Noise Suppression Settings"
          >
            {isNoiseFilterEnabled ? <NoiseFilterActiveIcon /> : <NoiseFilterIcon />}
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
