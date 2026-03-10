import React, { useRef, useCallback, MouseEventHandler, memo } from 'react';
import { Box } from 'folds';
import classNames from 'classnames';
import { useNavigate } from 'react-router-dom';
import type { Room } from 'matrix-js-sdk';
import { UnifiedChannel, VoiceRoom } from './types';
import { useDraggableChannel, useDropTarget, ChannelDragData, wasDragOperation } from './useChannelDnD';
import { useLiveKitContext } from '../voice/LiveKitContext';
import { useCallDuration } from '../voice/useCallDuration';
import * as css from './unifiedChannels.css';

interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isScreenSharing?: boolean;
}

interface DraggableChannelProps {
  channel: UnifiedChannel;
  categoryId: string;
  room?: Room; // For text channels
  voiceRoom?: VoiceRoom; // For voice channels
  participants?: ParticipantInfo[];
  selected?: boolean;
  linkPath?: string;
  onDragging: (item?: ChannelDragData) => void;
  disabled?: boolean;
  onVoiceChannelClick?: (roomName: string) => void;
  profileCache?: Record<string, { avatarUrl?: string; displayName: string }>;
}

function VoiceIcon({ connected }: { connected?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ color: connected ? '#43b581' : 'inherit', flexShrink: 0 }}
    >
      <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 7.58904H3C2.45 7.58904 2 8.03904 2 8.58904V15.589C2 16.139 2.45 16.589 3 16.589H6L10.293 20.882C10.579 21.168 11.009 21.253 11.383 21.099C11.757 20.945 12 20.578 12 20.169V4.00904C12 3.59904 11.757 3.23304 11.383 3.07904Z" />
      <path
        d="M14 9C14 9 16 10.5 16 12C16 13.5 14 15 14 15"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TextChannelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41045 9L8.35045 15H14.3504L15.4104 9H9.41045Z" />
    </svg>
  );
}

function getDisplayName(identity: string, fallbackName: string): string {
  if (identity.startsWith('@')) return identity.split(':')[0].slice(1);
  return fallbackName.split('-')[0];
}

// Memoized participant item to prevent re-renders from speaking state changes
interface ParticipantItemProps {
  identity: string;
  name: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
  isScreenSharing?: boolean;
  avatarUrl?: string;
  displayName: string;
}

const ParticipantItem = memo(function ParticipantItem({
  identity,
  isSpeaking,
  isMuted,
  isScreenSharing,
  avatarUrl,
  displayName,
}: ParticipantItemProps) {
  return (
    <div
      className={classNames(css.Participant, {
        [css.ParticipantSpeaking]: isSpeaking,
      })}
    >
      <div
        className={classNames(css.ParticipantAvatar, {
          [css.ParticipantAvatarWithImage]: !!avatarUrl,
          [css.ParticipantAvatarSpeaking]: isSpeaking,
        })}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          displayName.charAt(0).toUpperCase()
        )}
      </div>
      <span className={css.ParticipantName}>{displayName}</span>
      {/* Activity badges */}
      {isScreenSharing && (
        <span className={css.LiveBadge}>LIVE</span>
      )}
      {isMuted && (
        <svg className={css.ParticipantMutedIcon} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4C10.9 4 10 4.9 10 6V12C10 13.1 10.9 14 12 14C13.1 14 14 13.1 14 12V6C14 4.9 13.1 4 12 4ZM3.27 3L2 4.27L9.73 12H6V12.5C6 15.5 8.72 17.97 12 17.97L16.34 19.58L20.73 23L22 21.73L3.27 3Z" />
        </svg>
      )}
    </div>
  );
});

export function DraggableChannel({
  channel,
  categoryId,
  room,
  voiceRoom,
  participants = [],
  selected,
  linkPath,
  onDragging,
  disabled,
  onVoiceChannelClick,
  profileCache = {},
}: DraggableChannelProps) {
  const navigate = useNavigate();
  const targetRef = useRef<HTMLDivElement>(null);

  const { isConnected, currentRoom, setShowVoiceView } = useLiveKitContext();
  const { formatted: formattedDuration } = useCallDuration(isConnected);

  const isVoice = channel.type === 'voice';
  const isCurrentVoiceRoom = isVoice && currentRoom === channel.id;

  const dragItem: ChannelDragData = {
    type: 'channel',
    id: channel.id,
    categoryId,
    channelType: channel.type,
  };

  // Make entire channel row draggable
  const dragging = useDraggableChannel(dragItem, targetRef, onDragging);
  const dropState = useDropTarget(dragItem, targetRef);
  const dropType = dropState?.type;

  // Filter out ingress users for voice channels, but track who is streaming
  const streamingIdentities = new Set(
    participants
      .filter(p => p.identity.endsWith('-stream'))
      .map(p => p.identity.replace(/-stream$/, ''))
  );
  const displayParticipants = participants
    .filter(p => !p.identity.endsWith('-stream'))
    .map(p => ({
      ...p,
      // Show as streaming if participant or their -stream counterpart is streaming
      isScreenSharing: p.isScreenSharing || streamingIdentities.has(p.identity),
    }));

  const handleClick: MouseEventHandler = useCallback((e) => {
    // Don't handle click if we just finished dragging
    if (wasDragOperation()) {
      e.preventDefault();
      return;
    }
    if (disabled) return;

    if (isVoice) {
      if (isCurrentVoiceRoom) {
        setShowVoiceView(true);
      } else {
        onVoiceChannelClick?.(channel.id);
      }
    } else if (linkPath) {
      // Hide voice view when navigating to a text channel
      setShowVoiceView(false);
      navigate(linkPath);
    }
  }, [disabled, isVoice, isCurrentVoiceRoom, setShowVoiceView, onVoiceChannelClick, channel.id, linkPath, navigate]);

  return (
    <Box direction="Column">
      <div
        ref={targetRef}
        className={classNames(css.ChannelItem, {
          [css.ChannelItemSelected]: selected,
          [css.ChannelItemDragging]: dragging,
          [css.ChannelItemVoiceConnected]: isCurrentVoiceRoom,
          [css.DropIndicatorInto]: dropType === 'make-child',
        })}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
      >
        {dropType === 'reorder-above' && <div className={css.DropIndicatorAbove} />}
        {dropType === 'reorder-below' && <div className={css.DropIndicatorBelow} />}

        {isVoice ? (
          <VoiceIcon connected={isCurrentVoiceRoom} />
        ) : (
          <TextChannelIcon />
        )}

        <span
          className={classNames(css.ChannelName, {
            [css.ChannelNameVoiceConnected]: isCurrentVoiceRoom,
          })}
        >
          {channel.name}
        </span>

        {isVoice && isCurrentVoiceRoom && (
          <span className={css.CallDuration}>{formattedDuration}</span>
        )}

        {isVoice && voiceRoom && voiceRoom.numParticipants > 0 && !isCurrentVoiceRoom && (
          <span className={css.VoiceParticipantCount}>
            {voiceRoom.numParticipants}
          </span>
        )}
      </div>

      {/* Voice channel participants */}
      {isVoice && displayParticipants.length > 0 && (
        <div className={css.ParticipantsList}>
          {displayParticipants.map((p) => {
            const profile = profileCache[p.identity];
            const displayName = profile?.displayName || getDisplayName(p.identity, p.name);
            const avatarUrl = profile?.avatarUrl;

            return (
              <ParticipantItem
                key={p.identity}
                identity={p.identity}
                name={p.name}
                isSpeaking={p.isSpeaking}
                isMuted={p.isMuted}
                isScreenSharing={p.isScreenSharing}
                avatarUrl={avatarUrl}
                displayName={displayName}
              />
            );
          })}
        </div>
      )}
    </Box>
  );
}
