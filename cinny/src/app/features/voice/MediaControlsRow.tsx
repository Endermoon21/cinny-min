import React, { useState } from "react";
import classNames from "classnames";
import { StreamingModal } from "./StreamingModal";
import { isNativeStreamingAvailable, getNativeStreamStatus } from "./nativeStreaming";
import { useLiveKitContext } from "./LiveKitContext";
import * as css from "./voicePanel.css";

// Icons (stroke style)
const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

const VideoOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const ScreenShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="m17 8 5-5" />
    <path d="M17 3h5v5" />
  </svg>
);

// Monitor with X in center (for ending stream)
const ScreenShareActiveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M9 7l6 6" />
    <path d="M15 7l-6 6" />
  </svg>
);

const SoundboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <circle cx="8" cy="10" r="2" />
    <circle cx="16" cy="10" r="2" />
    <circle cx="12" cy="16" r="2" />
  </svg>
);

const ActivitiesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m4.93 4.93 4.24 4.24" />
    <path d="m14.83 9.17 4.24-4.24" />
    <path d="m14.83 14.83 4.24 4.24" />
    <path d="m9.17 14.83-4.24 4.24" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

export function MediaControlsRow() {
  const { isCameraEnabled, toggleCamera } = useLiveKitContext();
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Check streaming status periodically
  React.useEffect(() => {
    if (!isNativeStreamingAvailable()) return;

    const checkStatus = async () => {
      try {
        const status = await getNativeStreamStatus();
        setIsStreaming(status.active);
      } catch (e) {
        // Ignore errors
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleCamera();
  };

  const handleStreamClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowStreamModal(true);
  };

  return (
    <>
      <div className={css.MediaControlsRow}>
        <button
          className={classNames(css.MediaBtn, { [css.MediaBtnActive]: isCameraEnabled })}
          onClick={handleVideoClick}
          title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {isCameraEnabled ? <VideoIcon /> : <VideoOffIcon />}
        </button>

        <button
          className={classNames(css.MediaBtn, { [css.MediaBtnActive]: isStreaming })}
          onClick={handleStreamClick}
          title={isStreaming ? "Streaming" : "Share Screen"}
        >
          {isStreaming ? <ScreenShareActiveIcon /> : <ScreenShareIcon />}
        </button>
        
        <button
          className={css.MediaBtn}
          disabled
          title="Soundboard (Coming Soon)"
        >
          <SoundboardIcon />
        </button>
        
        <button
          className={css.MediaBtn}
          disabled
          title="Activities (Coming Soon)"
        >
          <ActivitiesIcon />
        </button>
      </div>

      {showStreamModal && <StreamingModal onClose={() => setShowStreamModal(false)} />}
    </>
  );
}
