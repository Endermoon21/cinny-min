import React, { useEffect, useRef, useState, useCallback } from "react";
import classNames from "classnames";
import FocusTrap from "focus-trap-react";
import { Portal } from "folds";
import { useLiveKitContext, VoiceParticipant } from "./LiveKitContext";
import { useMatrixClient } from "../../hooks/useMatrixClient";
import { useDeviceSelection } from "./useDeviceSelection";
import { StreamingModal } from "./StreamingModal";
import * as css from "./voiceRoom.css";

// Color palette for user tiles (Discord-like accent colors)
const TILE_COLORS = [
  // Muted pastels like Discord profile banners
  "#c9a87c", // Tan (like Discord screenshot)
  "#7289da", // Soft blue
  "#99aab5", // Soft gray-blue
  "#8e6e63", // Muted brown
  "#9b8aa6", // Soft purple
  "#87a889", // Sage green
  "#c4a484", // Warm tan
  "#8fa3bf", // Steel blue
  "#a4b494", // Muted olive
  "#b5838d", // Dusty rose
];

function getColorForUser(identity: string): string {
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = identity.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TILE_COLORS[Math.abs(hash) % TILE_COLORS.length];
}

// Icons (stroke style)
const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="13" rx="3" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v3" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 2 20 20" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <path d="M12 19v3" />
  </svg>
);

const MicOffSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m2 2 20 20" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <path d="M12 19v3" />
  </svg>
);

const ScreenShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="m17 8 5-5" />
    <path d="M17 3h5v5" />
  </svg>
);

const ScreenShareOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="m22 3-5 5" />
    <path d="m17 3 5 5" />
  </svg>
);

const ScreenShareSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
  </svg>
);

// Disconnect icon - phone hanging up (no slash)
const DisconnectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const VoiceChannelIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
    <path d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z"/>
    <path d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z"/>
  </svg>
);

const FullscreenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
    <path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
    <path d="M3 16v3a2 2 0 0 0 2 2h3"/>
    <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
  </svg>
);

const PipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <rect x="10" y="9" width="10" height="7" rx="1"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const VolumeHighIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5Z"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
  </svg>
);

const VolumeMuteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 5 6 9H2v6h4l5 4V5Z"/>
    <line x1="22" y1="9" x2="16" y2="15"/>
    <line x1="16" y1="9" x2="22" y2="15"/>
  </svg>
);

const VideoIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

const VideoOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.5l6-4v11l-6-4V14a2 2 0 0 1-2 2h-2.34" />
    <path d="M2 2l20 20" />
    <path d="M4.56 4.56A2 2 0 0 0 4 6v8a2 2 0 0 0 2 2h8" />
  </svg>
);

const CameraSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

// Monitor with X in center (for ending stream)
const ScreenShareActiveIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M9 7l6 6" />
    <path d="M15 7l-6 6" />
  </svg>
);

interface ParticipantControlProps {
  participant: VoiceParticipant;
  avatarUrl?: string;
  displayName: string;
  onClose: () => void;
}

function ParticipantControl({ participant, avatarUrl, displayName, onClose }: ParticipantControlProps) {
  const { participantVolumes, setParticipantVolume } = useLiveKitContext();
  const [localMuted, setLocalMuted] = useState(false);
  const volume = participantVolumes[participant.identity] ?? 1;
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setParticipantVolume(participant.identity, newVolume);
    if (newVolume > 0 && localMuted) setLocalMuted(false);
  };

  const toggleLocalMute = () => {
    if (localMuted) {
      setParticipantVolume(participant.identity, 1);
      setLocalMuted(false);
    } else {
      setParticipantVolume(participant.identity, 0);
      setLocalMuted(true);
    }
  };

  return (
    <div ref={popupRef} className={css.ParticipantPopup} onClick={(e) => e.stopPropagation()}>
      <div className={css.PopupHeader}>
        <div className={css.PopupAvatar}>
          {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : displayName.charAt(0).toUpperCase()}
        </div>
        <span className={css.PopupName}>{displayName}</span>
      </div>
      <div className={css.VolumeControl}>
        <div className={css.VolumeLabel}>
          <span>User Volume</span>
          <span className={css.VolumeValue}>{Math.round(volume * 100)}%</span>
        </div>
        <div className={css.VolumeSliderContainer}>
          <span className={css.VolumeIcon}>{volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}</span>
          <input type="range" min="0" max="2" step="0.01" value={volume} onChange={handleVolumeChange} className={css.VolumeSlider} />
        </div>
      </div>
      <button className={classNames(css.LocalMuteBtn, { [css.LocalMuteBtnActive]: localMuted || volume === 0 })} onClick={toggleLocalMute}>
        {localMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
        <span>{localMuted || volume === 0 ? "Unmute User" : "Mute User"}</span>
      </button>
    </div>
  );
}

// Device Accordion Component
interface DeviceAccordionProps {
  inputDevices: { deviceId: string; label: string }[];
  outputDevices: { deviceId: string; label: string }[];
  activeInputId: string | null;
  activeOutputId: string | null;
  onSelectInput: (deviceId: string) => void;
  onSelectOutput: (deviceId: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}

function DeviceAccordion({
  inputDevices,
  outputDevices,
  activeInputId,
  activeOutputId,
  onSelectInput,
  onSelectOutput,
  onClose,
  anchorRect,
}: DeviceAccordionProps) {
  const [inputExpanded, setInputExpanded] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeInputLabel = inputDevices.find(d => d.deviceId === activeInputId)?.label || "Default";
  const activeOutputLabel = outputDevices.find(d => d.deviceId === activeOutputId)?.label || "Default";

  const handleSelectInput = (deviceId: string) => {
    onSelectInput(deviceId);
    setInputExpanded(false);
  };

  const handleSelectOutput = (deviceId: string) => {
    onSelectOutput(deviceId);
    setOutputExpanded(false);
  };

  // Calculate position above the anchor
  const menuStyle: React.CSSProperties = anchorRect ? {
    position: 'fixed',
    bottom: window.innerHeight - anchorRect.top + 8,
    left: anchorRect.left,
    zIndex: 5,
  } : {};

  return (
    <Portal>
      <FocusTrap
        focusTrapOptions={{
          initialFocus: false,
          clickOutsideDeactivates: true,
          onDeactivate: onClose,
          escapeDeactivates: true,
        }}
      >
        <div ref={menuRef} className={css.DeviceMenuWrapper} style={menuStyle}>
        {/* Input Devices Section */}
        <div className={css.DeviceSection}>
          <div
            className={css.DeviceSectionHeader}
            onClick={() => setInputExpanded(!inputExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setInputExpanded(!inputExpanded)}
          >
            <span className={css.DeviceSectionLabel}>Input</span>
            <div className={css.DeviceSectionCurrent}>
              <span className={css.DeviceCurrentName}>{activeInputLabel}</span>
              <span className={classNames(css.DeviceChevron, { [css.DeviceChevronOpen]: inputExpanded })}>
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div className={classNames(css.DeviceList, { [css.DeviceListOpen]: inputExpanded })}>
            {inputDevices.length === 0 ? (
              <div className={css.DeviceOption}>
                <span className={css.DeviceOptionLabel}>No devices found</span>
              </div>
            ) : (
              inputDevices.map((device) => (
                <div
                  key={device.deviceId}
                  className={classNames(css.DeviceOption, {
                    [css.DeviceOptionActive]: device.deviceId === activeInputId,
                  })}
                  onClick={() => handleSelectInput(device.deviceId)}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSelectInput(device.deviceId)}
                >
                  <span className={css.DeviceOptionCheck}>
                    {device.deviceId === activeInputId && <CheckIcon />}
                  </span>
                  <span className={css.DeviceOptionLabel}>{device.label}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Output Devices Section */}
        <div className={css.DeviceSection}>
          <div
            className={css.DeviceSectionHeader}
            onClick={() => setOutputExpanded(!outputExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setOutputExpanded(!outputExpanded)}
          >
            <span className={css.DeviceSectionLabel}>Output</span>
            <div className={css.DeviceSectionCurrent}>
              <span className={css.DeviceCurrentName}>{activeOutputLabel}</span>
              <span className={classNames(css.DeviceChevron, { [css.DeviceChevronOpen]: outputExpanded })}>
                <ChevronDownIcon />
              </span>
            </div>
          </div>
          <div className={classNames(css.DeviceList, { [css.DeviceListOpen]: outputExpanded })}>
            {outputDevices.length === 0 ? (
              <div className={css.DeviceOption}>
                <span className={css.DeviceOptionLabel}>No devices found</span>
              </div>
            ) : (
              outputDevices.map((device) => (
                <div
                  key={device.deviceId}
                  className={classNames(css.DeviceOption, {
                    [css.DeviceOptionActive]: device.deviceId === activeOutputId,
                  })}
                  onClick={() => handleSelectOutput(device.deviceId)}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSelectOutput(device.deviceId)}
                >
                  <span className={css.DeviceOptionCheck}>
                    {device.deviceId === activeOutputId && <CheckIcon />}
                  </span>
                  <span className={css.DeviceOptionLabel}>{device.label}</span>
                </div>
              ))
            )}
            </div>
          </div>
        </div>
      </FocusTrap>
    </Portal>
  );
}

// Pop out icon
const PopOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

interface ParticipantTileProps {
  participant: VoiceParticipant;
  avatarUrl?: string;
  displayName: string;
  isStreamTile?: boolean;
  streamVideoElement?: HTMLVideoElement | null;
  isLive?: boolean; // Show LIVE badge (participant has active stream)
}

function ParticipantTile({ participant, avatarUrl, displayName, isStreamTile, streamVideoElement, isLive }: ParticipantTileProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const { participantVolumes, getCameraElement } = useLiveKitContext();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const volume = participantVolumes[participant.identity] ?? 1;
  const isLocalMuted = volume === 0;
  const tileColor = getColorForUser(participant.identity);
  const hasVideo = participant.isCameraEnabled || isStreamTile;

  // Attach video (camera or stream)
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container || !hasVideo) return;

    // Clear container first
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (isStreamTile && streamVideoElement) {
      streamVideoElement.style.width = "100%";
      streamVideoElement.style.height = "100%";
      streamVideoElement.style.objectFit = "contain";
      streamVideoElement.style.borderRadius = "8px";
      container.appendChild(streamVideoElement);
    } else if (participant.isCameraEnabled) {
      const videoEl = getCameraElement(participant.identity);
      if (videoEl) {
        videoEl.style.width = "100%";
        videoEl.style.height = "100%";
        videoEl.style.objectFit = "cover";
        videoEl.style.borderRadius = "8px";
        container.appendChild(videoEl);
      }
    }

    // Cleanup when component unmounts or dependencies change
    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [hasVideo, participant.isCameraEnabled, participant.identity, getCameraElement, isStreamTile, streamVideoElement]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent default browser context menu
    if (!participant.isLocal && !isStreamTile) setShowPopup(true);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoContainerRef.current?.querySelector("video");
    if (video) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        video.requestFullscreen().catch(console.error);
      }
    }
  };

  const handlePip = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoContainerRef.current?.querySelector("video");
    if (video && document.pictureInPictureEnabled) {
      video.requestPictureInPicture().catch(console.error);
    }
  };

  const handlePopOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoContainerRef.current?.querySelector("video");
    if (video) {
      const popout = window.open("", "_blank", "width=640,height=480,menubar=no,toolbar=no,location=no,status=no");
      if (popout) {
        popout.document.title = `${displayName}${isStreamTile ? "'s Stream" : "'s Camera"}`;
        popout.document.body.style.margin = "0";
        popout.document.body.style.background = "#000";
        const clonedVideo = video.cloneNode(true) as HTMLVideoElement;
        clonedVideo.style.width = "100%";
        clonedVideo.style.height = "100%";
        clonedVideo.style.objectFit = "contain";
        popout.document.body.appendChild(clonedVideo);
        clonedVideo.play().catch(console.error);
      }
    }
  };

  return (
    <div className={css.TileWrapper}>
      <div
        className={classNames(css.ParticipantTile, {
          [css.TileClickable]: !participant.isLocal && !isStreamTile,
          [css.ParticipantTileSpeaking]: participant.isSpeaking && !isLocalMuted && !isStreamTile,
          [css.StreamTile]: isStreamTile,
        })}
        style={{ backgroundColor: hasVideo ? "#000" : tileColor }}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => hasVideo && setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {hasVideo ? (
          // Show video (camera or stream) - key forces remount when switching
          <div key="video" ref={videoContainerRef} className={css.TileVideoContainer} />
        ) : (
          // Show avatar - key forces remount when switching
          <div key="avatar" className={css.TileAvatarContainer}>
            <div className={classNames(css.TileAvatar, {
              [css.TileAvatarFallback]: !avatarUrl,
            })}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className={css.TileAvatarImg} />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
        )}

        {/* Video controls overlay */}
        {hasVideo && showControls && (
          <div className={css.TileVideoControls}>
            <button className={css.TileControlBtn} onClick={handlePip} title="Picture in Picture">
              <PipIcon />
            </button>
            {!isStreamTile && (
              <button className={css.TileControlBtn} onClick={handlePopOut} title="Pop Out">
                <PopOutIcon />
              </button>
            )}
            <button className={css.TileControlBtn} onClick={handleFullscreen} title="Fullscreen">
              <FullscreenIcon />
            </button>
          </div>
        )}

        {/* LIVE badge - on stream tiles or when participant is streaming */}
        {(isStreamTile || isLive) && (
          <div className={css.TileActivityBadges}>
            <span className={css.LiveBadgeSmall}>LIVE</span>
          </div>
        )}

        {/* Status icons - bottom right */}
        <div style={{ position: "absolute", bottom: "50px", right: "12px", display: "flex", gap: "4px" }}>
          {isLocalMuted ? (
            <div className={classNames(css.TileStatusOverlay, css.TileStatusMuted)} style={{ position: "relative" }}>
              <VolumeMuteIcon />
            </div>
          ) : participant.isMuted && (
            <div className={classNames(css.TileStatusOverlay, css.TileStatusMuted)} style={{ position: "relative" }}>
              <MicOffSmallIcon />
            </div>
          )}
        </div>

        <div className={css.TileInfo}>
          <span className={css.TileName}>{displayName}{isStreamTile ? "'s stream" : ""}</span>
          {participant.isLocal && !isStreamTile && <span className={css.TileYou}>(You)</span>}
        </div>
      </div>
      {showPopup && (
        <ParticipantControl
          participant={participant}
          avatarUrl={avatarUrl}
          displayName={displayName}
          onClose={() => setShowPopup(false)}
        />
      )}
    </div>
  );
}

export function VoiceRoom() {
  const mx = useMatrixClient();
  const {
    currentRoom, participants, isMuted, isCameraEnabled, screenShareInfo, connectionQuality,
    disconnect, toggleMute, toggleCamera, getScreenShareElement, getCameraElement, room,
    isNativeStreaming
  } = useLiveKitContext();

  const deviceSelection = useDeviceSelection(room);

  const muteButtonRef = useRef<HTMLDivElement>(null);
  const cameraButtonRef = useRef<HTMLDivElement>(null);
  const [profileCache, setProfileCache] = useState<Record<string, { avatarUrl?: string; displayName: string }>>({});
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Use isNativeStreaming from context
  const isStreaming = isNativeStreaming;

  useEffect(() => {
    const fetchProfiles = async () => {
      for (const p of participants) {
        if (profileCache[p.identity]) continue;
        if (!p.identity.startsWith("@")) {
          setProfileCache(prev => ({ ...prev, [p.identity]: { displayName: p.identity } }));
          continue;
        }
        try {
          const cachedUser = mx.getUser(p.identity);
          if (cachedUser?.avatarUrl) {
            const avatarUrl = mx.mxcUrlToHttp(cachedUser.avatarUrl, 120, 120, "crop") || undefined;
            setProfileCache(prev => ({ ...prev, [p.identity]: { avatarUrl, displayName: cachedUser.displayName || p.identity.split(":")[0].slice(1) } }));
            continue;
          }
          const baseUrl = mx.getHomeserverUrl();
          const res = await fetch(`${baseUrl}/_matrix/client/v3/profile/${encodeURIComponent(p.identity)}`);
          if (res.ok) {
            const profile = await res.json();
            let avatarUrl: string | undefined;
            if (profile.avatar_url) avatarUrl = mx.mxcUrlToHttp(profile.avatar_url, 120, 120, "crop") || undefined;
            setProfileCache(prev => ({ ...prev, [p.identity]: { avatarUrl, displayName: profile.displayname || p.identity.split(":")[0].slice(1) } }));
          } else {
            setProfileCache(prev => ({ ...prev, [p.identity]: { displayName: p.identity.split(":")[0].slice(1) } }));
          }
        } catch {
          setProfileCache(prev => ({ ...prev, [p.identity]: { displayName: p.identity.split(":")[0].slice(1) } }));
        }
      }
    };
    fetchProfiles();
  }, [participants, mx, profileCache]);

  const roomDisplayName = currentRoom ? currentRoom.charAt(0).toUpperCase() + currentRoom.slice(1) : "Voice Channel";
  const qualityText = connectionQuality?.quality || "connecting";
  const getQualityClass = () => {
    switch (connectionQuality?.quality) {
      case "excellent": return css.QualityExcellent;
      case "good": return css.QualityGood;
      case "poor": return css.QualityPoor;
      default: return css.QualityBad;
    }
  };

  return (
    <div className={css.VoiceRoomContainer}>
      <div className={css.ChannelHeader}>
        <div className={css.ChannelName}>
          <VoiceChannelIcon />
          {roomDisplayName}
        </div>
        <div className={classNames(css.QualityBadge, getQualityClass())}>{qualityText}</div>
      </div>

      <div className={css.MainArea}>
        {(() => {
          // Filter out ingress users (identity ending with -stream)
          const visibleParticipants = participants.filter(p => !p.identity.endsWith("-stream"));

          // Get identities of active streamers (ingress participants)
          const activeStreamerIds = new Set(
            participants
              .filter(p => p.identity.endsWith("-stream"))
              .map(p => p.identity.replace(/-stream$/, ""))
          );

          // Get stream video element if someone is screen sharing
          const streamVideoEl = screenShareInfo ? getScreenShareElement() : null;

          if (visibleParticipants.length > 0 || screenShareInfo) {
            return (
              <div className={css.ParticipantGrid}>
                {/* Show stream as a tile if someone is sharing */}
                {screenShareInfo && (
                  <ParticipantTile
                    key={`stream-${screenShareInfo.participantIdentity}`}
                    participant={{
                      identity: screenShareInfo.participantIdentity,
                      name: screenShareInfo.participantName,
                      isSpeaking: false,
                      isMuted: false,
                      isLocal: false,
                      isCameraEnabled: false,
                      isScreenSharing: true,
                      volume: 1,
                    }}
                    avatarUrl={profileCache[screenShareInfo.participantIdentity]?.avatarUrl}
                    displayName={profileCache[screenShareInfo.participantIdentity]?.displayName || screenShareInfo.participantName}
                    isStreamTile
                    streamVideoElement={streamVideoEl}
                  />
                )}
                {/* Show regular participants */}
                {visibleParticipants.map((p) => (
                  <ParticipantTile
                    key={p.identity}
                    participant={p}
                    avatarUrl={profileCache[p.identity]?.avatarUrl}
                    displayName={profileCache[p.identity]?.displayName || p.name}
                    isLive={activeStreamerIds.has(p.identity)}
                  />
                ))}
              </div>
            );
          }

          return (
            <div className={css.EmptyState}>
              <VoiceChannelIcon />
              <span className={css.EmptyText}>Waiting for others to join...</span>
            </div>
          );
        })()}
      </div>

      <div className={css.ControlBar}>
        <div className={css.ControlGroup}>
          {/* Camera button with device selector dropdown */}
          <div ref={cameraButtonRef} className={css.ControlBtnWithDropdown}>
            <button
              className={classNames(css.ControlBtnMain, { [css.ControlBtnMainGreen]: isCameraEnabled })}
              onClick={toggleCamera}
              title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
            >
              {isCameraEnabled ? <VideoIcon /> : <VideoOffIcon />}
            </button>
            <button
              className={css.ControlBtnDropdownArrow}
              onClick={() => setShowCameraMenu(!showCameraMenu)}
              title="Select camera"
            >
              <ChevronDownIcon />
            </button>

            {showCameraMenu && cameraButtonRef.current && (
              <Portal>
                <FocusTrap
                  focusTrapOptions={{
                    initialFocus: false,
                    clickOutsideDeactivates: true,
                    onDeactivate: () => setShowCameraMenu(false),
                    escapeDeactivates: true,
                  }}
                >
                  <div
                    className={css.DeviceMenuWrapper}
                    style={{
                      position: 'fixed',
                      bottom: window.innerHeight - cameraButtonRef.current.getBoundingClientRect().top + 8,
                      left: cameraButtonRef.current.getBoundingClientRect().left,
                      zIndex: 5,
                    }}
                  >
                    <div className={css.DeviceSection}>
                      <div className={css.DeviceSectionHeader}>
                        <span className={css.DeviceSectionLabel}>Camera</span>
                      </div>
                      <div className={classNames(css.DeviceList, css.DeviceListOpen)}>
                        {deviceSelection.videoDevices.length === 0 ? (
                          <div className={css.DeviceOption}>
                            <span className={css.DeviceOptionLabel}>No cameras found</span>
                          </div>
                        ) : (
                          deviceSelection.videoDevices.map((device) => (
                            <div
                              key={device.deviceId}
                              className={classNames(css.DeviceOption, {
                                [css.DeviceOptionActive]: device.deviceId === deviceSelection.activeVideoId,
                              })}
                              onClick={() => {
                                deviceSelection.switchVideo(device.deviceId);
                                setShowCameraMenu(false);
                              }}
                              role="menuitem"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  deviceSelection.switchVideo(device.deviceId);
                                  setShowCameraMenu(false);
                                }
                              }}
                            >
                              <span className={css.DeviceOptionCheck}>
                                {device.deviceId === deviceSelection.activeVideoId && <CheckIcon />}
                              </span>
                              <span className={css.DeviceOptionLabel}>{device.label}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </FocusTrap>
              </Portal>
            )}
          </div>

          {/* Mute button with device selector dropdown */}
          <div ref={muteButtonRef} className={css.ControlBtnWithDropdown}>
            <button
              className={classNames(css.ControlBtnMain, { [css.ControlBtnMainActive]: isMuted })}
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOffIcon /> : <MicIcon />}
            </button>
            <button
              className={classNames(css.ControlBtnDropdownArrow, { [css.ControlBtnDropdownArrowMuted]: isMuted })}
              onClick={() => setShowDeviceMenu(!showDeviceMenu)}
              title="Select audio devices"
            >
              <ChevronDownIcon />
            </button>

            {showDeviceMenu && (
              <DeviceAccordion
                inputDevices={deviceSelection.inputDevices}
                outputDevices={deviceSelection.outputDevices}
                activeInputId={deviceSelection.activeInputId}
                activeOutputId={deviceSelection.activeOutputId}
                onSelectInput={deviceSelection.switchInput}
                onSelectOutput={deviceSelection.switchOutput}
                onClose={() => setShowDeviceMenu(false)}
                anchorRect={muteButtonRef.current?.getBoundingClientRect() || null}
              />
            )}
          </div>

          <button
            className={classNames(css.ControlBtn, { [css.ControlBtnGreen]: isStreaming })}
            onClick={() => setShowStreamModal(true)}
            title={isStreaming ? "End Stream" : "Share Screen"}
          >
            {isStreaming ? <ScreenShareActiveIcon /> : <ScreenShareIcon />}
          </button>
        </div>
        <button className={css.DisconnectBtn} onClick={disconnect} title="Disconnect">
          <DisconnectIcon />
        </button>
      </div>

      {showStreamModal && <StreamingModal onClose={() => setShowStreamModal(false)} />}
    </div>
  );
}
