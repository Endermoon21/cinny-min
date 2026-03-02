import React, { useState } from "react";
import classNames from "classnames";
import { StreamingModal } from "./StreamingModal";
import { isNativeStreamingAvailable, getNativeStreamStatus } from "./nativeStreaming";
import * as css from "./voicePanel.css";

// Icons
const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
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

const ScreenShareActiveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <circle cx="18" cy="6" r="4" fill="#F23F43" stroke="none" />
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
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <path d="M12 17h.01" />
  </svg>
);

export function MediaControlsRow() {
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

  return (
    <>
      <div className={css.MediaControlsRow}>
        <button
          className={css.MediaBtn}
          disabled
          title="Video (Coming Soon)"
        >
          <VideoIcon />
        </button>
        
        <button
          className={classNames(css.MediaBtn, { [css.MediaBtnActive]: isStreaming })}
          onClick={() => setShowStreamModal(true)}
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
