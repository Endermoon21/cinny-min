import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, IconButton, config } from 'folds';
import classNames from 'classnames';
import { useLiveKitContext, VoiceParticipant } from './LiveKitContext';
import * as css from './callView.css';

// Calculate optimal grid layout using brute-force algorithm (Zoom-style)
// Finds the column count that maximizes total tile area while fitting in container
function calculateOptimalLayout(
  containerWidth: number,
  containerHeight: number,
  tileCount: number,
  gap: number = 8
): { cols: number; rows: number; tileSize: number } {
  if (tileCount === 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { cols: 1, rows: 1, tileSize: 100 };
  }

  let bestLayout = { cols: 1, rows: tileCount, tileSize: 0, area: 0 };

  for (let cols = 1; cols <= tileCount; cols++) {
    const rows = Math.ceil(tileCount / cols);

    // Calculate available space for tiles (accounting for gaps)
    const totalGapWidth = (cols - 1) * gap;
    const totalGapHeight = (rows - 1) * gap;
    const availableWidth = containerWidth - totalGapWidth;
    const availableHeight = containerHeight - totalGapHeight;

    if (availableWidth <= 0 || availableHeight <= 0) continue;

    // Calculate max tile size that fits (for square tiles)
    const maxTileWidth = availableWidth / cols;
    const maxTileHeight = availableHeight / rows;

    // Use the smaller dimension to ensure tiles fit
    const tileSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));

    // Calculate total area for this layout
    if (tileSize > 0) {
      const area = tileSize * tileSize * tileCount;

      if (area > bestLayout.area) {
        bestLayout = { cols, rows, tileSize, area };
      }
    }
  }

  // Ensure minimum tile size
  return {
    cols: bestLayout.cols,
    rows: bestLayout.rows,
    tileSize: Math.max(bestLayout.tileSize, 60)
  };
}

interface ParticipantTileProps {
  participant: VoiceParticipant;
  onWatchStream?: () => void;
  isLocalDeafened?: boolean;
  tileSize: number;
}

function ParticipantTile({ participant, onWatchStream, isLocalDeafened, tileSize }: ParticipantTileProps) {
  const isClickable = participant.isScreenSharing && onWatchStream;
  const showDeafened = participant.isLocal && isLocalDeafened;

  // Debug: log tile size being applied
  console.log('[Tile] Rendering with size:', tileSize);

  return (
    <div
      className={classNames(css.ParticipantTile, {
        [css.Speaking]: participant.isSpeaking,
        [css.Clickable]: isClickable,
      })}
      style={{ width: `${tileSize}px`, height: `${tileSize}px` }}
      onClick={isClickable ? onWatchStream : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <div className={css.TileAvatar}>
        <span>{participant.name.split('-')[0].charAt(0).toUpperCase()}</span>
      </div>
      <div className={css.TileInfo}>
        <Text size="T300" className={css.TileName}>
          {participant.name.split('-')[0]} {participant.isLocal && '(you)'}
        </Text>
        <div className={css.TileIcons}>
          {showDeafened ? (
            <svg className={css.DeafenedIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.27 1.44L2 2.72L4.05 4.77C2.75 6.37 2 8.38 2 10.5V11H5V10.5C5 9.06 5.46 7.72 6.24 6.6L20.27 20.63L21.54 19.36L3.27 1.44ZM12 3.5C8.13 3.5 5 6.63 5 10.5V11H2V10.5C2 5.53 6.03 1.5 11 1.5H13C17.97 1.5 22 5.53 22 10.5V11H19V10.5C19 6.63 15.87 3.5 12 3.5Z" />
            </svg>
          ) : participant.isMuted && (
            <svg className={css.MutedIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4C10.9 4 10 4.9 10 6V12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12V6C14 4.9 13.1 4 12 4ZM3.27 3L2 4.27L9.73 12H6V12.5C6 15.5 8.72 17.97 12 17.97L16.34 19.58L20.73 23L22 21.73L3.27 3Z" />
            </svg>
          )}
          {participant.isScreenSharing && (
            <svg className={css.ScreenIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
            </svg>
          )}
        </div>
      </div>
      {/* Visual indicator for streamers - only show if actually clickable */}
      {participant.isScreenSharing && onWatchStream && (
        <Text size="T200" className={css.WatchHint}>Click to watch</Text>
      )}
    </div>
  );
}

function CompactParticipantTile({ participant }: { participant: VoiceParticipant }) {
  return (
    <div className={classNames(css.ParticipantTileCompact, { [css.Speaking]: participant.isSpeaking })}>
      <div className={css.TileAvatarCompact}>
        <span>{participant.name.split('-')[0].charAt(0).toUpperCase()}</span>
      </div>
      <span className={css.TileNameCompact}>
        {participant.name.split('-')[0]} {participant.isLocal && '(you)'}
      </span>
      {participant.isMuted && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={css.MutedIcon}>
          <path d="M12 4C10.9 4 10 4.9 10 6V12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12V6C14 4.9 13.1 4 12 4ZM3.27 3L2 4.27L9.73 12H6V12.5C6 15.5 8.72 17.97 12 17.97L16.34 19.58L20.73 23L22 21.73L3.27 3Z" />
        </svg>
      )}
    </div>
  );
}

export function VoiceCallView() {
  const {
    isConnected,
    currentRoom,
    participants,
    isMuted,
    isDeafened,

    screenShareInfo,
    connectionQuality,
    disconnect,
    toggleMute,
    toggleDeafen,
    setShowVoiceView,
    getScreenShareElement,
  } = useLiveKitContext();

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [viewingStream, setViewingStream] = useState(false);
  const [gridLayout, setGridLayout] = useState({ cols: 2, rows: 2, tileSize: 150 });

  // Calculate optimal grid layout when container size or participant count changes
  useEffect(() => {
    // Don't run if viewing stream (grid is hidden)
    if (viewingStream) return;
    if (participants.length === 0) return;

    const calculateAndSetLayout = () => {
      const container = gridContainerRef.current;
      let containerWidth: number;
      let containerHeight: number;

      if (container) {
        const rect = container.getBoundingClientRect();
        containerWidth = rect.width;
        containerHeight = rect.height;
        console.log('[Grid] Container rect:', { width: rect.width, height: rect.height });
      } else {
        // Fallback: estimate based on viewport
        containerWidth = window.innerWidth * 0.85;
        containerHeight = window.innerHeight * 0.6;
        console.log('[Grid] Using fallback:', { width: containerWidth, height: containerHeight });
      }

      // Skip if still no valid size
      if (containerWidth <= 0 || containerHeight <= 0) {
        console.log('[Grid] Invalid size, skipping');
        return;
      }

      const padding = 16; // S200 padding
      const gap = 8; // S200 gap
      const availableWidth = containerWidth - padding;
      const availableHeight = containerHeight - padding;

      const layout = calculateOptimalLayout(availableWidth, availableHeight, participants.length, gap);
      console.log('[Grid] Calculated layout:', layout);

      // Only update if tileSize changed significantly (avoid jitter)
      setGridLayout(prev => {
        if (Math.abs(prev.tileSize - layout.tileSize) > 5 || prev.cols !== layout.cols) {
          console.log('[Grid] Updating layout to:', layout);
          return layout;
        }
        return prev;
      });
    };

    // Initial calculation with delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      calculateAndSetLayout();
    }, 50);

    // Also try with RAF
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(calculateAndSetLayout);
    });

    // Recalculate on resize
    const container = gridContainerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(calculateAndSetLayout);
      resizeObserver.observe(container);
    }

    // Also listen for window resize as backup
    window.addEventListener('resize', calculateAndSetLayout);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', calculateAndSetLayout);
    };
  }, [participants.length, viewingStream]);

  // Reset viewing state when screen share ends
  useEffect(() => {
    if (!screenShareInfo) {
      setViewingStream(false);
    }
  }, [screenShareInfo]);

  useEffect(() => {
    if (viewingStream && screenShareInfo && videoContainerRef.current) {
      const videoEl = getScreenShareElement();
      if (videoEl) {
        videoContainerRef.current.innerHTML = '';
        videoEl.className = css.ScreenShareVideo;
        videoContainerRef.current.appendChild(videoEl);
      }
    }
  }, [viewingStream, screenShareInfo, getScreenShareElement]);

  if (!isConnected || !currentRoom) return null;

  const roomDisplayName = currentRoom.charAt(0).toUpperCase() + currentRoom.slice(1);
  const qualityColor = connectionQuality?.quality === 'excellent' || connectionQuality?.quality === 'good' ? 'var(--mx-positive)' : connectionQuality?.quality === 'poor' ? 'var(--mx-warning)' : 'var(--mx-critical)';

  return (
    <div className={css.CallViewOverlay}>
      <div className={css.CallView}>
        <div className={css.Header}>
          <div className={css.HeaderLeft}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 7.58904H3C2.45 7.58904 2 8.03904 2 8.58904V15.589C2 16.139 2.45 16.589 3 16.589H6L10.293 20.882C10.579 21.168 11.009 21.253 11.383 21.099C11.757 20.945 12 20.578 12 20.169V4.00904C12 3.59904 11.757 3.23304 11.383 3.07904Z" />
            </svg>
            <Text size="H4" weight="Medium">{roomDisplayName}</Text>
            {connectionQuality && (
              <div className={css.QualityBadge} style={{ backgroundColor: qualityColor }}>
                {connectionQuality.quality.toUpperCase()}
              </div>
            )}
          </div>
          <button className={css.CloseBtn} onClick={() => setShowVoiceView(false)} title="Minimize">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 13H5v-2h14v2z" />
            </svg>
          </button>
        </div>

        <div className={css.Content}>
          {viewingStream && screenShareInfo ? (
            <>
              <div className={css.MainContent}>
                <div className={css.ScreenShareContainer}>
                  <div ref={videoContainerRef} className={css.VideoContainer} />
                  <div className={css.ScreenShareLabel}>
                    <span>{screenShareInfo.participantName.split('-')[0]}'s screen</span>
                    <button className={css.BackToParticipantsBtn} onClick={() => setViewingStream(false)}>
                      Back
                    </button>
                  </div>
                </div>
              </div>
              {/* Compact participant strip at bottom during streaming */}
              <div className={css.ParticipantStrip}>
                {participants.map((p) => (
                  <CompactParticipantTile key={p.identity} participant={p} />
                ))}
              </div>
            </>
          ) : (
            <div
              ref={gridContainerRef}
              className={css.ParticipantGrid}
            >
              {participants.map((p) => {
                // Only make clickable if screen share track is actually available
                // screenShareInfo is set when the video track is subscribed
                const canWatch = p.isScreenSharing && screenShareInfo !== null;
                return (
                  <ParticipantTile
                    key={p.identity}
                    participant={p}
                    onWatchStream={canWatch ? () => setViewingStream(true) : undefined}
                    isLocalDeafened={isDeafened}
                    tileSize={gridLayout.tileSize}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className={css.Controls}>
          <button
            className={classNames(css.ControlBtn, { [css.Active]: isMuted })}
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              {isMuted ? (
                <path d="M12 4C10.9 4 10 4.9 10 6V12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12V6C14 4.9 13.1 4 12 4ZM3.27 3L2 4.27L9.73 12H6V12.5C6 15.5 8.72 17.97 12 17.97L16.34 19.58L20.73 23L22 21.73L3.27 3Z" />
              ) : (
                <path d="M12 4C10.9 4 10 4.9 10 6V12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12V6C14 4.9 13.1 4 12 4ZM18 12H21V12.5C21 17.5 16.97 21.58 12 22.37V24H12V22.37C7.03 21.58 3 17.5 3 12.5V12H6V12.5C6 15.5 8.72 17.97 12 17.97C15.28 17.97 18 15.5 18 12.5V12Z" />
              )}
            </svg>
          </button>

          <button
            className={classNames(css.ControlBtn, { [css.Active]: isDeafened })}
            onClick={toggleDeafen}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              {isDeafened ? (
                <path d="M3.27 1.44L2 2.72L4.05 4.77C2.75 6.37 2 8.38 2 10.5V11H5V10.5C5 9.06 5.46 7.72 6.24 6.6L20.27 20.63L21.54 19.36L3.27 1.44ZM12 3.5C8.13 3.5 5 6.63 5 10.5V11H2V10.5C2 5.53 6.03 1.5 11 1.5H13C17.97 1.5 22 5.53 22 10.5V11H19V10.5C19 6.63 15.87 3.5 12 3.5Z" />
              ) : (
                <path d="M12 3.5C8.13 3.5 5 6.63 5 10.5V11H2V10.5C2 5.53 6.03 1.5 11 1.5H13C17.97 1.5 22 5.53 22 10.5V11H19V10.5C19 6.63 15.87 3.5 12 3.5ZM6 15V10.5C6 7.18 8.69 4.5 12 4.5C15.31 4.5 18 7.18 18 10.5V15C18 18.31 15.31 21 12 21C8.69 21 6 18.31 6 15Z" />
              )}
            </svg>
          </button>

          <button
            className={css.ControlBtn}
            disabled
            title="Use Stream button in panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
            </svg>
          </button>

          <button className={css.DisconnectBtn} onClick={disconnect} title="Disconnect">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
